import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateSlug, generateToken } from '@/lib/nanoid';
import { checkRateLimit } from '@/lib/rate-limit';
import { sanitizeText, sanitizeName, sanitizeHtml, isValidTime, isValidDate, isValidTimezone } from '@/lib/sanitize';

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

/**
 * Convert a local date+time string in a given IANA timezone to a UTC Date.
 * Uses the Intl.DateTimeFormat trick: format the naive-UTC date in the target
 * timezone, measure the drift, then apply the inverse offset.
 */
function zonedToUtc(dateStr: string, timeStr: string, tz: string): Date {
  const naiveUtc = new Date(`${dateStr}T${timeStr}:00.000Z`);
  const localRepr = new Intl.DateTimeFormat('sv-SE', {
    timeZone: tz,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).format(naiveUtc);
  const localDate = new Date(localRepr.replace(' ', 'T') + 'Z');
  const offset = naiveUtc.getTime() - localDate.getTime();
  return new Date(naiveUtc.getTime() + offset);
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
    name, description, body: bodyText, organizerName, location, durationMinutes,
    responseDeadline, maxParticipants, timezone, coverImageUrl,
    // Availability-mode fields
    dates, timeStart, timeEnd,
    // Fixed-mode fields
    eventType, fixedDate, fixedTime,
  } = body;

  // --- Shared validation ---
  if (!name || typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ error: 'Event name is required' }, { status: 400 });
  }

  if (timezone && !isValidTimezone(timezone)) {
    return NextResponse.json({ error: 'Invalid timezone' }, { status: 400 });
  }

  // Accept any duration 1–1440 min; default 60 if invalid
  const safeDuration = Number.isInteger(durationMinutes) && durationMinutes > 0 && durationMinutes <= 1440
    ? durationMinutes
    : 60;

  const safeEventType = eventType === 'fixed' ? 'fixed' : 'availability';

  // --- Type-specific validation ---
  let safeDates: string[];
  let safeTimeStart: string;
  let safeTimeEnd: string;
  let finalizedTime: string | null = null;

  if (safeEventType === 'fixed') {
    if (!fixedDate || !isValidDate(fixedDate)) {
      return NextResponse.json({ error: 'A valid event date is required' }, { status: 400 });
    }
    if (!fixedTime || !isValidTime(fixedTime)) {
      return NextResponse.json({ error: 'A valid start time is required' }, { status: 400 });
    }
    safeDates = [fixedDate];
    safeTimeStart = fixedTime;
    safeTimeEnd = addMinutesToTime(fixedTime, safeDuration);
    finalizedTime = zonedToUtc(fixedDate, fixedTime, timezone || 'UTC').toISOString();
  } else {
    if (!Array.isArray(dates) || dates.length === 0 || dates.length > 31) {
      return NextResponse.json({ error: 'Select between 1 and 31 dates' }, { status: 400 });
    }
    for (const d of dates) {
      if (!isValidDate(d)) {
        return NextResponse.json({ error: `Invalid date: ${d}` }, { status: 400 });
      }
    }
    if (!timeStart || !timeEnd || !isValidTime(timeStart) || !isValidTime(timeEnd)) {
      return NextResponse.json({ error: 'Valid start and end times are required' }, { status: 400 });
    }
    if (timeStart >= timeEnd) {
      return NextResponse.json({ error: 'End time must be after start time' }, { status: 400 });
    }
    safeDates = dates;
    safeTimeStart = timeStart;
    safeTimeEnd = timeEnd;
  }

  // Validate max participants (optional)
  let safeMaxParticipants: number | null = null;
  if (maxParticipants !== undefined && maxParticipants !== null && maxParticipants !== '' && maxParticipants !== 0) {
    const num = Number(maxParticipants);
    if (Number.isInteger(num) && num >= 2 && num <= 1000) {
      safeMaxParticipants = num;
    }
  }

  // --- Sanitize text inputs ---
  const safeName = sanitizeText(name, 100);
  const safeDescription = description ? sanitizeText(description, 500) : null;
  const safeBody = bodyText ? sanitizeHtml(bodyText) : null;
  const safeOrganizerName = organizerName ? sanitizeName(organizerName) : null;
  const safeLocation = location ? sanitizeText(location, 600) : null;

  if (!safeName) {
    return NextResponse.json({ error: 'Event name is required' }, { status: 400 });
  }

  const supabase = await createClient();
  const slug = generateSlug();
  const organizerToken = generateToken();

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
    ...(safeDescription && { description: safeDescription }),
    ...(safeOrganizerName && { organizer_name: safeOrganizerName }),
    ...(safeLocation && { location: safeLocation }),
    ...(safeBody && { body: safeBody }),
    ...(responseDeadline && { response_deadline: responseDeadline }),
    ...(safeMaxParticipants && { max_participants: safeMaxParticipants }),
    ...(coverImageUrl && typeof coverImageUrl === 'string' && /^https?:\/\//i.test(coverImageUrl)
      ? { cover_image_url: coverImageUrl.substring(0, 500) }
      : {}),
  };

  const { data, error } = await supabase
    .from('events')
    .insert(insertPayload)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
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
      })
      .select('id')
      .single();
    if (participant) {
      organizerParticipantId = participant.id;
    }
  }

  return NextResponse.json({
    slug: data.slug,
    organizerToken,
    organizerParticipantId,
    organizerName: safeOrganizerName,
  }, {
    status: 201,
    headers: { 'X-RateLimit-Remaining': String(remaining) },
  });
}
