import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/rate-limit';

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

  const { finalized_time, organizer_token } = body;

  if (!organizer_token || typeof organizer_token !== 'string') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createClient();

  if (!(await verifyOrganizer(supabase, id, organizer_token))) {
    return NextResponse.json({ error: 'Only the organizer can do this' }, { status: 403 });
  }

  // Only allow finalized_time to be set (not arbitrary fields)
  const { data, error } = await supabase
    .from('events')
    .update({ finalized_time: finalized_time || null })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
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

  const { searchParams } = new URL(request.url);
  const organizer_token = searchParams.get('organizer_token');
  const participant_id = searchParams.get('participant_id');

  if (!organizer_token || !participant_id) {
    return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
  }

  if (!isValidUUID(participant_id)) {
    return NextResponse.json({ error: 'Invalid participant ID' }, { status: 400 });
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
