import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

async function verifyOrganizer(supabase: Awaited<ReturnType<typeof createClient>>, eventId: string, token: string) {
  const { data: event } = await supabase
    .from('events')
    .select('organizer_token')
    .eq('id', eventId)
    .single();

  return event && event.organizer_token === token;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { finalized_time, organizer_token } = body;

  if (!organizer_token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createClient();

  if (!(await verifyOrganizer(supabase, id, organizer_token))) {
    return NextResponse.json({ error: 'Only the organizer can do this' }, { status: 403 });
  }

  const { data, error } = await supabase
    .from('events')
    .update({ finalized_time })
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
  const { searchParams } = new URL(request.url);
  const organizer_token = searchParams.get('organizer_token');
  const participant_id = searchParams.get('participant_id');

  if (!organizer_token || !participant_id) {
    return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
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
