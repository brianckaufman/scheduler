import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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

  // Verify the organizer token matches
  const { data: event } = await supabase
    .from('events')
    .select('organizer_token')
    .eq('id', id)
    .single();

  if (!event || event.organizer_token !== organizer_token) {
    return NextResponse.json({ error: 'Only the organizer can finalize the time' }, { status: 403 });
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
