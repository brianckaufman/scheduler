import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateSlug, generateToken } from '@/lib/nanoid';
import { checkRateLimit } from '@/lib/rate-limit';
import { sanitizeText, sanitizeName, sanitizeHtml, isValidTime, isValidDate, isValidTimezone } from '@/lib/sanitize';
import { normalizeHex } from '@/lib/eventColors';
import { isEventKind } from '@/lib/eventTypes';
import { sanitizeConfig } from '@/lib/eventConfig';
import { zonedToUtc } from '@/lib/slots';

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

/** Add minutes to a HH:MM time string, wrapping at midnight. Returns HH:MM. */
function addMinutesToTime(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m + minutes;
  const endH = Math.floor(total / 60) % 24;
  const endM = total % 60;
  return `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;
}

export async function POST(request: NextRequest) {
  // Rate limit: 10 events per IP per hour
  const ip = getClientIp(request);
  const { allowed, remaining } = checkRateLimit(ip, 'create-event', {
    limit: 10,
    windowSeconds: 3600,
  });

  if (!allowed) {
    return NextResponse.json(
      { error: 'Too many events created. Please try again later.' },
      {
        status: 429,
        headers: { 'Retry-After': '3600', 'X-RateLimit-Remaining': '0' },
      }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const {
    name, description, body: bodyText, organizerName, organizerEmail, location, durationMinutes,
    responseDeadline, maxParticipants, minResponses, color, hideGuestList, eventKind, config, timezone,
    // Availability-mode fields
    dates, timeStart, timeEnd, minBlockDays,
    // Fixed-mode fields
    eventType, fixedDate, fixedTime,
    // All-day mode (both flows) — whole days instead of times-of-day.
    allDay, fixedEndDate,
  } = body;

  const safeAllDay = allDay === true;
  // All-day events still store NOT NULL time_start/time_end — these sentinels
  // are never read for slot math (generateAllDaySlots is used instead), only
  // stored to satisfy the column constraint.
  const ALL_DAY_TIME_START = '00:00';
  const ALL_DAY_TIME_END = '23:59';

  // --- Shared validation ---
  if (!name || typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ error: 'Event name is required' }, { status: 400 });
  }

  if (timezone && !isValidTimezone(timezone)) {
    return NextResponse.json({ error: 'Invalid timezone' }, { status: 400 });
  }

  // Accept any duration 1–1440 min; default 60 if invalid. All-day events get
  // a fixed 240 sentinel — duration is meaningless for a whole-day event and
  // is never shown when all_day. Durations above 240 need
  // supabase-duration-range-migration.sql to have been run.
  const safeDuration = safeAllDay
    ? 240
    : Number.isInteger(durationMinutes) && durationMinutes > 0 && durationMinutes <= 1440
      ? durationMinutes
      : 60;

  const safeEventType = eventType === 'fixed' ? 'fixed' : 'availability';

  // --- Type-specific validation ---
  let safeDates: string[];
  let safeTimeStart: string;
  let safeTimeEnd: string;
  let finalizedTime: string | null = null;
  let finalizedEndDate: string | null = null;

  if (safeEventType === 'fixed') {
    if (!fixedDate || !isValidDate(fixedDate)) {
      return NextResponse.json({ error: 'A valid event date is required' }, { status: 400 });
    }
    safeDates = [fixedDate];

    if (safeAllDay) {
      // Optional range end — a single all-day date if omitted.
      let rangeEnd = fixedDate;
      if (fixedEndDate) {
        if (!isValidDate(fixedEndDate)) {
          return NextResponse.json({ error: 'Invalid end date' }, { status: 400 });
        }
        if (fixedEndDate < fixedDate) {
          return NextResponse.json({ error: 'End date must be on or after the start date' }, { status: 400 });
        }
        rangeEnd = fixedEndDate;
      }
      safeTimeStart = ALL_DAY_TIME_START;
      safeTimeEnd = ALL_DAY_TIME_END;
      finalizedTime = zonedToUtc(fixedDate, ALL_DAY_TIME_START, timezone || 'UTC').toISOString();
      finalizedEndDate = rangeEnd;
    } else {
      if (!fixedTime || !isValidTime(fixedTime)) {
        return NextResponse.json({ error: 'A valid start time is required' }, { status: 400 });
      }
      safeTimeStart = fixedTime;
      safeTimeEnd = addMinutesToTime(fixedTime, safeDuration);
      finalizedTime = zonedToUtc(fixedDate, fixedTime, timezone || 'UTC').toISOString();
    }
  } else {
    if (!Array.isArray(dates) || dates.length === 0 || dates.length > 31) {
      return NextResponse.json({ error: 'Select between 1 and 31 dates' }, { status: 400 });
    }
    for (const d of dates) {
      if (!isValidDate(d)) {
        return NextResponse.json({ error: `Invalid date: ${d}` }, { status: 400 });
      }
    }
    safeDates = dates;

    if (safeAllDay) {
      safeTimeStart = ALL_DAY_TIME_START;
      safeTimeEnd = ALL_DAY_TIME_END;
    } else {
      if (!timeStart || !timeEnd || !isValidTime(timeStart) || !isValidTime(timeEnd)) {
        return NextResponse.json({ error: 'Valid start and end times are required' }, { status: 400 });
      }
      if (timeStart >= timeEnd) {
        return NextResponse.json({ error: 'End time must be after start time' }, { status: 400 });
      }
      safeTimeStart = timeStart;
      safeTimeEnd = timeEnd;
    }
  }

  // Validate max participants (optional)
  let safeMaxParticipants: number | null = null;
  if (maxParticipants !== undefined && maxParticipants !== null && maxParticipants !== '' && maxParticipants !== 0) {
    const num = Number(maxParticipants);
    if (Number.isInteger(num) && num >= 2 && num <= 1000) {
      safeMaxParticipants = num;
    }
  }

  // Validate min responses (optional, availability events only)
  let safeMinResponses: number | null = null;
  if (minResponses !== undefined && minResponses !== null && minResponses !== '') {
    const num = Number(minResponses);
    // Floor is 2 — the DB CHECK requires >= 2, and a minimum of 1 is meaningless
    // (the first response always satisfies it). Anything below 2 = no minimum.
    if (Number.isInteger(num) && num >= 2 && num <= 1000) {
      safeMinResponses = num;
    }
  }

  // Validate the required consecutive-block length (all-day availability only).
  // A block of 1 is just a normal day, so the floor is 2; cap at the max number
  // of proposable dates (31). Ignored unless this is an all-day availability event.
  let safeMinBlockDays: number | null = null;
  if (safeAllDay && safeEventType === 'availability' && minBlockDays !== undefined && minBlockDays !== null && minBlockDays !== '') {
    const num = Number(minBlockDays);
    if (Number.isInteger(num) && num >= 2 && num <= 31) {
      safeMinBlockDays = num;
    }
  }

  // --- Sanitize text inputs ---
  const safeName = sanitizeText(name, 100);
  const safeBody = bodyText ? sanitizeHtml(bodyText) : null;
  // description is no longer authored separately — it's a plain-text summary
  // auto-derived from the rich Additional Details body, used for SEO/OG meta
  // and ICS calendar descriptions.
  const safeDescription = description ? sanitizeText(description, 500) : (safeBody ? sanitizeText(safeBody, 500) : null);
  const safeOrganizerName = organizerName ? sanitizeName(organizerName) : null;
  const safeLocation = location ? sanitizeText(location, 600) : null;
  const safeColor = typeof color === 'string' ? normalizeHex(color) : null;

  // Optional organizer email (for organizer notifications). Validate loosely.
  let safeOrganizerEmail: string | null = null;
  if (typeof organizerEmail === 'string' && organizerEmail.trim()) {
    const e = organizerEmail.trim().toLowerCase();
    if (e.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) {
      safeOrganizerEmail = e;
    } else {
      return NextResponse.json({ error: 'Please enter a valid email, or leave it blank.' }, { status: 400 });
    }
  }

  // Detect organizer device type
  const organizerUa = request.headers.get('user-agent') ?? '';
  const organizerDevice = /Mobile|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(organizerUa)
    ? 'mobile'
    : 'desktop';

  if (!safeName) {
    return NextResponse.json({ error: 'Event name is required' }, { status: 400 });
  }

  const supabase = await createClient();
  const slug = generateSlug();
  const organizerToken = generateToken();

  // Link to the logged-in user if there is one (anonymous creation still works).
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id ?? null;

  // Inherit the creator's account brand kit (Phase 6). Tolerates a missing table.
  let brandKit: { brand_color?: string | null; logo_url?: string | null; icon_bg?: string | null; icon_fg?: string | null } | null = null;
  if (userId) {
    const { data: bk } = await supabase
      .from('brand_kits').select('brand_color, logo_url, icon_bg, icon_fg').eq('user_id', userId).maybeSingle();
    brandKit = bk ?? null;
  }
  const effectiveColor = safeColor || (brandKit?.brand_color ?? null);

  // Only include optional nullable columns when they have values — avoids
  // "column not found in schema cache" errors if migrations haven't been run yet.
  const insertPayload = {
    slug,
    name: safeName,
    organizer_token: organizerToken,
    dates: safeDates,
    time_start: safeTimeStart,
    time_end: safeTimeEnd,
    timezone: timezone || 'UTC',
    duration_minutes: safeDuration,
    event_type: safeEventType,
    ...(finalizedTime && { finalized_time: finalizedTime }),
    // all_day / finalized_end_date require supabase-all-day-events-migration.sql.
    ...(safeAllDay && { all_day: true }),
    ...(finalizedEndDate && { finalized_end_date: finalizedEndDate }),
    ...(safeDescription && { description: safeDescription }),
    ...(safeOrganizerName && { organizer_name: safeOrganizerName }),
    // organizer_email requires supabase-organizer-email-migration.sql to be run first.
    ...(safeOrganizerEmail && { organizer_email: safeOrganizerEmail }),
    ...(safeLocation && { location: safeLocation }),
    ...(safeBody && { body: safeBody }),
    ...(responseDeadline && { response_deadline: responseDeadline }),
    ...(safeMaxParticipants && { max_participants: safeMaxParticipants }),
    ...(safeMinResponses && { min_responses: safeMinResponses }),
    // min_block_days requires supabase-block-days-migration.sql to be run first.
    ...(safeMinBlockDays && { min_block_days: safeMinBlockDays }),
    // color requires supabase-event-color-migration.sql to be run first.
    ...(effectiveColor && { color: effectiveColor }),
    // Brand-kit branding inheritance (Phase 2/6 columns).
    ...(brandKit?.logo_url && { logo_url: brandKit.logo_url }),
    ...(brandKit?.icon_bg && { icon_bg: brandKit.icon_bg }),
    ...(brandKit?.icon_fg && { icon_fg: brandKit.icon_fg }),
    // hide_guest_list requires supabase-hide-guest-list-migration.sql first.
    ...(hideGuestList === true && { hide_guest_list: true }),
    // event_kind requires supabase-event-kind-migration.sql first.
    ...(isEventKind(eventKind) && eventKind !== 'casual' && { event_kind: eventKind }),
    // config (module toggles) requires supabase-event-branding-modules-migration.sql.
    ...(config && typeof config === 'object' && { config: sanitizeConfig(config) }),
    // user_id requires supabase-accounts-migration.sql to be run first.
    ...(userId && { user_id: userId }),
    // device_type requires supabase-analytics-migration.sql to be run first
    // ...(organizerDevice && { device_type: organizerDevice }),
  };

  // Resilient insert: if an optional column from an un-run migration isn't in
  // the schema cache, strip it and retry so the event still gets created (the
  // un-migrated feature's value is simply dropped). Required columns always
  // exist, so this only ever removes optional migration-added fields.
  const payload: Record<string, unknown> = { ...insertPayload };
  let result = await supabase.from('events').insert(payload as never).select().single();
  for (let i = 0; i < 8 && result.error; i++) {
    const missing = result.error?.message?.match(/Could not find the '([^']+)' column/i)?.[1];
    if (!missing || !(missing in payload)) break;
    delete payload[missing];
    result = await supabase.from('events').insert(payload as never).select().single();
  }
  const { data, error } = result;

  if (error || !data) {
    // The old duration CHECK only allowed durations up to 4 hours. If it's
    // still in place, say so in plain language instead of leaking Postgres.
    if (/events_duration_valid/i.test(error?.message ?? '')) {
      return NextResponse.json(
        { error: 'Events longer than 4 hours need a quick database update — run supabase-duration-range-migration.sql.' },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: error?.message || 'Failed to create event' }, { status: 500 });
  }

  // Auto-add the organizer as a participant if they provided their name.
  // For fixed events, organizer's RSVP defaults to 'yes'.
  let organizerParticipantId: string | null = null;
  if (safeOrganizerName) {
    const { data: participant } = await supabase
      .from('participants')
      .insert({
        event_id: data.id,
        name: safeOrganizerName,
        ...(safeEventType === 'fixed' ? { rsvp: 'yes' } : {}),
        ...(userId && { user_id: userId }),
      })
      .select('id')
      .single();
    if (participant) {
      organizerParticipantId = participant.id;
    }
  }

  return NextResponse.json({
    id: data.id,
    slug: data.slug,
    organizerToken,
    organizerParticipantId,
    organizerName: safeOrganizerName,
  }, {
    status: 201,
    headers: { 'X-RateLimit-Remaining': String(remaining) },
  });
}
