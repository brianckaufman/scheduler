import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/rate-limit';

const VALID_RSVP = ['yes', 'maybe', 'no'] as const;

function isValidUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!isValidUUID(id)) {
    return NextResponse.json({ error: 'Invalid participant ID' }, { status: 400 });
  }

  const ip = getClientIp(request);
  const { allowed } = checkRateLimit(ip, 'update-rsvp', { limit: 60, windowSeconds: 3600 });
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests. Try again later.' }, { status: 429 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { rsvp, event_id, guest_count } = body;

  if (!VALID_RSVP.includes(rsvp)) {
    return NextResponse.json({ error: 'Invalid RSVP value. Must be yes, maybe, or no.' }, { status: 400 });
  }

  if (!event_id || !isValidUUID(event_id)) {
    return NextResponse.json({ error: 'Invalid event_id' }, { status: 400 });
  }

  const supabase = await createClient();

  // Guests only count for "Going". Clamp to the same range as the DB CHECK.
  const safeGuests = rsvp === 'yes' && Number.isInteger(guest_count) && guest_count > 0
    ? Math.min(guest_count, 20)
    : 0;

  // Capacity: RSVP events cap confirmed headcount (yes responders + their
  // guests) at events.max_participants. Enforce when claiming a "yes" spot.
  if (rsvp === 'yes') {
    const { data: ev } = await supabase
      .from('events').select('max_participants').eq('id', event_id).single();
    if (ev?.max_participants) {
      let headcountOthers = 0;
      const { data: others, error: othersErr } = await supabase
        .from('participants').select('id, guest_count')
        .eq('event_id', event_id).eq('rsvp', 'yes').neq('id', id);
      if (!othersErr && others) {
        headcountOthers = (others as unknown as { guest_count: number | null }[])
          .reduce((sum, p) => sum + 1 + (p.guest_count || 0), 0);
      } else {
        // guest_count column may not exist yet (migration not run) → count rows.
        const { count } = await supabase
          .from('participants').select('id', { count: 'exact', head: true })
          .eq('event_id', event_id).eq('rsvp', 'yes').neq('id', id);
        headcountOthers = count ?? 0;
      }
      if (headcountOthers + 1 + safeGuests > ev.max_participants) {
        const left = Math.max(0, ev.max_participants - headcountOthers);
        return NextResponse.json(
          {
            error: left === 0
              ? 'Sorry, this event just filled up.'
              : `Only ${left} spot${left === 1 ? '' : 's'} left — reduce your guest count.`,
            full: true,
            spotsLeft: left,
          },
          { status: 409 }
        );
      }
    }
  }

  // Verify the participant belongs to the given event (prevents cross-event RSVP spoofing).
  // Retry without guest_count if the column isn't there yet, so RSVP never hard-breaks.
  let { data, error } = await supabase
    .from('participants')
    .update({ rsvp, guest_count: safeGuests })
    .eq('id', id)
    .eq('event_id', event_id)
    .select()
    .single();

  if (error && /guest_count|column|schema/i.test(error.message)) {
    ({ data, error } = await supabase
      .from('participants')
      .update({ rsvp })
      .eq('id', id)
      .eq('event_id', event_id)
      .select()
      .single());
  }

  if (error || !data) {
    return NextResponse.json({ error: 'Participant not found' }, { status: 404 });
  }

  return NextResponse.json(data);
}
