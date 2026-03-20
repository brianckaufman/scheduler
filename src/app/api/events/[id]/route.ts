import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/rate-limit';
import { sendPushNotifications } from '@/lib/push';
import { sanitizeText, sanitizeName, sanitizeHtml } from '@/lib/sanitize';

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
    safeUpdate.location = updates.location ? sanitizeText(updates.location, 100) : null;
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
  if ('body' in updates) {
    safeUpdate.body = updates.body ? sanitizeHtml(String(updates.body)) : null;
  }

  if (Object.keys(safeUpdate).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
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

  // Send push notifications when a time is finalized (not when un-finalizing)
  if (updates.finalized_time && data) {
    const finalDate = new Date(updates.finalized_time);
    const timeStr = finalDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
      + ' at ' + finalDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

    sendPushNotifications(supabase, id, {
      title: `${data.name}: Time Picked!`,
      body: `${data.organizer_name || 'The organizer'} picked ${timeStr}`,
      url: `/e/${data.slug}`,
    }).catch((err) => console.error('Push notification error:', err));
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
