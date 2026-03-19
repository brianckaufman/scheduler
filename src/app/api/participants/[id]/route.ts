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

  const { rsvp, event_id } = body;

  if (!VALID_RSVP.includes(rsvp)) {
    return NextResponse.json({ error: 'Invalid RSVP value. Must be yes, maybe, or no.' }, { status: 400 });
  }

  if (!event_id || !isValidUUID(event_id)) {
    return NextResponse.json({ error: 'Invalid event_id' }, { status: 400 });
  }

  const supabase = await createClient();

  // Verify the participant belongs to the given event (prevents cross-event RSVP spoofing)
  const { data, error } = await supabase
    .from('participants')
    .update({ rsvp })
    .eq('id', id)
    .eq('event_id', event_id)
    .select()
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Participant not found' }, { status: 404 });
  }

  return NextResponse.json(data);
}
