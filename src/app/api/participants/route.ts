import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/rate-limit';
import { sanitizeName } from '@/lib/sanitize';

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

  const { event_id, name } = body;

  if (!event_id || !isValidUUID(event_id)) {
    return NextResponse.json({ error: 'Invalid event ID' }, { status: 400 });
  }

  const safeName = sanitizeName(name);
  if (!safeName) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }

  const supabase = await createClient();

  // Fetch event to check deadline and participant limit
  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('id, response_deadline, max_participants, event_type')
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

  // Enforce max participants
  if (event.max_participants) {
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

  const { data, error } = await supabase
    .from('participants')
    .insert({
      event_id,
      name: safeName,
      ...(deviceType && { device_type: deviceType }),
    })
    .select()
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Failed to join event.' }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
