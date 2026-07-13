import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/rate-limit';
import { sendPushNotifications } from '@/lib/push';
import { sendParticipantTimeEmails } from '@/lib/email';
import { parseLocation, locationLabel } from '@/lib/location';
import { sanitizeText, sanitizeName, sanitizeHtml } from '@/lib/sanitize';
import { normalizeHex } from '@/lib/eventColors';
import { sanitizeConfig } from '@/lib/eventConfig';
import { isEventKind } from '@/lib/eventTypes';
import { formatEventDateRange } from '@/lib/dateRange';

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

async function verifyOrganizer(supabase: Awaited<ReturnType<typeof createClient>>, eventId: string, token: string) {
  // Use timing-safe-ish comparison (constant time isn't critical for tokens this long,
  // but we validate server-side rather than trusting the client)
  const { data: event } = await supabase
    .from('events')
    .select('organizer_token')
    .eq('id', eventId)
    .single();

  if (!event) return false;

  // Compare tokens — both are random nanoid strings, not user-derived passwords
  return event.organizer_token === token;
}

/** Validate UUID format */
function isValidUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!isValidUUID(id)) {
    return NextResponse.json({ error: 'Invalid event ID' }, { status: 400 });
  }

  // Rate limit: 20 updates per IP per hour
  const ip = getClientIp(request);
  const { allowed } = checkRateLimit(ip, 'update-event', { limit: 20, windowSeconds: 3600 });
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests. Try again later.' }, { status: 429 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { organizer_token, ...updates } = body;

  if (!organizer_token || typeof organizer_token !== 'string') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createClient();

  if (!(await verifyOrganizer(supabase, id, organizer_token))) {
    return NextResponse.json({ error: 'Only the organizer can do this' }, { status: 403 });
  }

  // Build safe update object — only allow specific fields
  const safeUpdate: Record<string, unknown> = {};

  if ('finalized_time' in updates) {
    safeUpdate.finalized_time = updates.finalized_time || null;
  }
  if ('finalized_end_date' in updates) {
    const endDate = updates.finalized_end_date;
    if (endDate) {
      if (typeof endDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
        return NextResponse.json({ error: 'Invalid end date' }, { status: 400 });
      }
      // A range end needs a range start in the same request (or already set).
      const startISO = ('finalized_time' in updates ? updates.finalized_time : null)
        ?? (await supabase.from('events').select('finalized_time').eq('id', id).single()).data?.finalized_time
        ?? null;
      if (!startISO) {
        return NextResponse.json({ error: 'finalized_end_date requires finalized_time to be set' }, { status: 400 });
      }
      if (endDate < startISO.slice(0, 10)) {
        return NextResponse.json({ error: 'End date must be on or after the start date' }, { status: 400 });
      }
      safeUpdate.finalized_end_date = endDate;
    } else {
      safeUpdate.finalized_end_date = null;
    }
  }
  if ('name' in updates && typeof updates.name === 'string') {
    const safeName = sanitizeText(updates.name, 100);
    if (!safeName) return NextResponse.json({ error: 'Event name cannot be empty' }, { status: 400 });
    safeUpdate.name = safeName;
  }
  if ('description' in updates) {
    safeUpdate.description = updates.description ? sanitizeText(updates.description, 500) : null;
  }
  if ('organizer_name' in updates && typeof updates.organizer_name === 'string') {
    const safeName = sanitizeName(updates.organizer_name);
    if (!safeName) return NextResponse.json({ error: 'Organizer name cannot be empty' }, { status: 400 });
    safeUpdate.organizer_name = safeName;
  }
  if ('location' in updates) {
    safeUpdate.location = updates.location ? sanitizeText(updates.location, 600) : null;
  }
  if ('duration_minutes' in updates) {
    const valid = [10, 15, 30, 45, 60, 90, 120, 180, 240];
    if (valid.includes(updates.duration_minutes)) {
      safeUpdate.duration_minutes = updates.duration_minutes;
    }
  }
  if ('response_deadline' in updates) {
    safeUpdate.response_deadline = updates.response_deadline || null;
  }
  if ('max_participants' in updates) {
    const val = updates.max_participants;
    if (val === null || val === '' || val === 0) {
      safeUpdate.max_participants = null;
    } else if (typeof val === 'number' && val >= 2 && val <= 1000) {
      safeUpdate.max_participants = val;
    }
  }
  if ('min_responses' in updates) {
    const val = updates.min_responses;
    if (val === null || val === '' || val === 0) {
      safeUpdate.min_responses = null;
    } else {
      const num = Number(val);
      if (Number.isInteger(num) && num >= 2 && num <= 1000) {
        safeUpdate.min_responses = num;
      }
    }
  }
  if ('min_block_days' in updates) {
    const val = updates.min_block_days;
    if (val === null || val === '' || val === 0) {
      safeUpdate.min_block_days = null;
    } else {
      const num = Number(val);
      if (Number.isInteger(num) && num >= 2 && num <= 31) {
        safeUpdate.min_block_days = num;
      }
    }
  }
  if ('body' in updates) {
    const safeBody = updates.body ? sanitizeHtml(String(updates.body)) : null;
    safeUpdate.body = safeBody;
    // description is no longer authored separately — keep it in sync as a
    // plain-text summary of the body (used for SEO/OG meta and ICS
    // descriptions), unless the caller explicitly sent its own description.
    if (!('description' in updates)) {
      safeUpdate.description = safeBody ? sanitizeText(safeBody, 500) : null;
    }
  }
  if ('color' in updates) {
    safeUpdate.color = typeof updates.color === 'string' ? normalizeHex(updates.color) : null;
  }
  if ('hide_guest_list' in updates) {
    safeUpdate.hide_guest_list = !!updates.hide_guest_list;
  }
  // Polished Pro (Phase 2) — per-event branding + module config.
  if ('logo_url' in updates) {
    safeUpdate.logo_url = typeof updates.logo_url === 'string' && updates.logo_url ? updates.logo_url : null;
  }
  if ('photo_url' in updates) {
    safeUpdate.photo_url = typeof updates.photo_url === 'string' && updates.photo_url ? updates.photo_url : null;
  }
  if ('icon_bg' in updates) {
    safeUpdate.icon_bg = typeof updates.icon_bg === 'string' ? normalizeHex(updates.icon_bg) : null;
  }
  if ('icon_fg' in updates) {
    safeUpdate.icon_fg = typeof updates.icon_fg === 'string' ? normalizeHex(updates.icon_fg) : null;
  }
  if ('config' in updates) {
    safeUpdate.config = sanitizeConfig(updates.config);
  }
  if ('event_kind' in updates) {
    safeUpdate.event_kind = isEventKind(updates.event_kind) ? updates.event_kind : null;
  }


  if (Object.keys(safeUpdate).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  // When finalizing, capture the prior value so we can tell a first-time pick
  // ("time finalized") from an edit of an already-set time ("time changed").
  let priorFinalized: string | null = null;
  if ('finalized_time' in updates) {
    const { data: prior } = await supabase
      .from('events').select('finalized_time').eq('id', id).single();
    priorFinalized = prior?.finalized_time ?? null;
  }

  const { data, error } = await supabase
    .from('events')
    .update(safeUpdate)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Notify participants when a time is finalized (not when un-finalizing)
  if (updates.finalized_time && data) {
    const timeStr = formatEventDateRange(updates.finalized_time, data.finalized_end_date, !!data.all_day, { withWeekday: false });
    const organizerName = data.organizer_name || 'The organizer';

    const origin = request.headers.get('origin')
      || process.env.NEXT_PUBLIC_SITE_URL
      || `https://${request.headers.get('host') || ''}`;
    const eventUrl = `${origin}/e/${data.slug}`;

    // First-time pick vs. an edit of an already-set time.
    const isChange = !!priorFinalized && priorFinalized !== updates.finalized_time;
    const variant = isChange ? 'time_changed' as const : 'time_finalized' as const;
    const locLabel = data.location ? locationLabel(parseLocation(data.location)) : null;

    // Await both so the serverless function stays alive until the sends complete.
    // (Fire-and-forget here gets dropped when the response returns on Vercel.)
    // allSettled = one channel failing never blocks the other or the response.
    await Promise.allSettled([
      // Web push (opted-in browsers)
      sendPushNotifications(supabase, id, {
        title: isChange ? `${data.name}: Time Changed` : `${data.name}: Time Picked!`,
        body: `${organizerName} ${isChange ? 'changed the time to' : 'picked'} ${timeStr}`,
        url: `/e/${data.slug}`,
      }),
      // Email (participants who provided an address) + calendar invite
      sendParticipantTimeEmails(supabase, id, {
        variant,
        eventName: data.name,
        organizerName,
        timeStr,
        eventUrl,
        calendar: {
          name: data.name,
          startISO: updates.finalized_time,
          durationMinutes: data.duration_minutes || 60,
          description: data.description,
          location: locLabel,
          allDay: !!data.all_day,
          endDateISO: data.finalized_end_date ?? null,
        },
      }),
    ]);
  }

  return NextResponse.json(data);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!isValidUUID(id)) {
    return NextResponse.json({ error: 'Invalid event ID' }, { status: 400 });
  }

  let body: { organizer_token?: string; participant_id?: string; delete_event?: boolean | string } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { organizer_token, participant_id, delete_event } = body;

  if (!organizer_token || typeof organizer_token !== 'string') {
    return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
  }

  // Rate limit: 30 deletes per IP per hour
  const ip = getClientIp(request);
  const { allowed } = checkRateLimit(ip, 'delete-participant', { limit: 30, windowSeconds: 3600 });
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests. Try again later.' }, { status: 429 });
  }

  const supabase = await createClient();

  if (!(await verifyOrganizer(supabase, id, organizer_token))) {
    return NextResponse.json({ error: 'Only the organizer can do this' }, { status: 403 });
  }

  // Delete entire event
  if (delete_event === true || delete_event === 'true') {
    // Delete availability_slots, then participants, then event
    await supabase.from('availability_slots').delete().eq('event_id', id);
    await supabase.from('participants').delete().eq('event_id', id);
    const { error } = await supabase.from('events').delete().eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, deleted: 'event' });
  }

  // Delete a single participant
  if (!participant_id) {
    return NextResponse.json({ error: 'Missing participant_id parameter' }, { status: 400 });
  }

  if (!isValidUUID(participant_id)) {
    return NextResponse.json({ error: 'Invalid participant ID' }, { status: 400 });
  }

  // Delete participant's availability slots first
  await supabase
    .from('availability_slots')
    .delete()
    .eq('event_id', id)
    .eq('participant_id', participant_id);

  // Delete the participant
  const { error } = await supabase
    .from('participants')
    .delete()
    .eq('id', participant_id)
    .eq('event_id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
