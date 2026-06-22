import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/rate-limit';
import { sanitizeName } from '@/lib/sanitize';
import { sendOrganizerEmail } from '@/lib/email';

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

function isValidUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

export async function POST(request: NextRequest) {
  // Rate limit: 20 joins per IP per hour
  const ip = getClientIp(request);
  const { allowed } = checkRateLimit(ip, 'join-event', { limit: 20, windowSeconds: 3600 });
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests. Try again later.' }, { status: 429 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { event_id, name, email } = body;

  if (!event_id || !isValidUUID(event_id)) {
    return NextResponse.json({ error: 'Invalid event ID' }, { status: 400 });
  }

  const safeName = sanitizeName(name);
  if (!safeName) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }

  // Optional email for finalize notifications. Validate loosely; ignore if invalid.
  let safeEmail: string | null = null;
  if (typeof email === 'string' && email.trim()) {
    const e = email.trim().toLowerCase();
    if (e.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) {
      safeEmail = e;
    } else {
      return NextResponse.json({ error: 'Please enter a valid email, or leave it blank.' }, { status: 400 });
    }
  }

  const supabase = await createClient();

  // Fetch event to check deadline and participant limit
  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('id, slug, name, response_deadline, max_participants, event_type, min_responses, organizer_name, finalized_time')
    .eq('id', event_id)
    .single();

  if (eventError || !event) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 });
  }

  // Enforce response deadline (availability events only)
  if (event.event_type === 'availability' && event.response_deadline) {
    if (new Date() > new Date(event.response_deadline)) {
      return NextResponse.json({ error: 'The response deadline for this event has passed.' }, { status: 403 });
    }
  }

  // Enforce max participants at join time for availability events only. RSVP
  // events cap on confirmed headcount (yes + guests), enforced when someone
  // RSVPs "yes" (see PATCH /api/participants/[id]) — so people can still view
  // and decline a full event, and can join to RSVP "maybe"/"no".
  if (event.event_type === 'availability' && event.max_participants) {
    const { count } = await supabase
      .from('participants')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', event_id);

    if (count !== null && count >= event.max_participants) {
      return NextResponse.json(
        { error: `This event is full (${event.max_participants} max).`, full: true },
        { status: 409 }
      );
    }
  }

  // Prevent duplicate names (case-insensitive)
  const { data: existing } = await supabase
    .from('participants')
    .select('id')
    .eq('event_id', event_id)
    .ilike('name', safeName)
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { error: 'Someone with that name already joined. Try adding a last initial (e.g. "Alex K").' },
      { status: 409 }
    );
  }

  // Detect device type from User-Agent header
  const ua = request.headers.get('user-agent') ?? '';
  const deviceType = /Mobile|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua)
    ? 'mobile'
    : 'desktop';

  // Link to the logged-in user if there is one (anonymous join still works).
  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('participants')
    .insert({
      event_id,
      name: safeName,
      // user_id requires supabase-accounts-migration.sql to be run first.
      ...(user?.id && { user_id: user.id }),
      // email requires supabase-participant-email-migration.sql to be run first.
      // Conditional spread keeps inserts working until then (only included when provided).
      ...(safeEmail && { email: safeEmail }),
      // device_type requires supabase-analytics-migration.sql to be run first
      // ...(deviceType && { device_type: deviceType }),
    })
    .select()
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Failed to join event.' }, { status: 500 });
  }

  // ── Organizer email notifications (best-effort; never block the join) ──
  // Awaited so the serverless function stays alive until the send completes.
  try {
    const minR = (event as { min_responses?: number | null }).min_responses ?? null;
    if (event.event_type === 'availability' && !event.finalized_time) {
      // organizer_email lives behind a migration — fetch separately so a missing
      // column can't break the join. (Supabase returns an error, not a throw.)
      const { data: oe } = await supabase
        .from('events').select('organizer_email').eq('id', event_id).single();
      const organizerEmail = (oe as { organizer_email?: string | null } | null)?.organizer_email ?? null;

      if (organizerEmail) {
        const { count } = await supabase
          .from('participants').select('id', { count: 'exact', head: true }).eq('event_id', event_id);
        const total = count ?? 0;

        const origin = request.headers.get('origin')
          || process.env.NEXT_PUBLIC_SITE_URL
          || `https://${request.headers.get('host') || ''}`;
        const eventUrl = `${origin}/e/${event.slug}`;
        const organizerName = event.organizer_name || 'there';

        // Minimum reached — fire once, exactly on the crossing.
        if (minR && minR >= 2 && total === minR) {
          await sendOrganizerEmail({
            kind: 'min_responses_reached', organizerEmail, organizerName,
            eventName: event.name, eventUrl, count: total, minResponses: minR,
          });
        }
        // Each new response (disabled by default in settings).
        await sendOrganizerEmail({
          kind: 'new_response', organizerEmail, organizerName,
          eventName: event.name, eventUrl, count: total, participantName: safeName,
        });
      }
    }
  } catch (err) {
    console.error('Organizer notification error:', err);
  }

  return NextResponse.json(data, { status: 201 });
}
