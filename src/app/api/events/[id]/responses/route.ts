import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

function isValidUUID(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}

/** Organizer: all question responses for the event, with participant names. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isValidUUID(id)) return NextResponse.json({ error: 'Invalid event ID' }, { status: 400 });

  const token = new URL(request.url).searchParams.get('organizer_token') || '';

  const supabase = await createClient();
  const { data: ev } = await supabase.from('events').select('organizer_token').eq('id', id).single();
  if (!ev || ev.organizer_token !== token) {
    return NextResponse.json({ error: 'Only the organizer can do this' }, { status: 403 });
  }

  const admin = createAdminClient();
  const { data } = await admin
    .from('question_responses')
    .select('question_id, value, participant_id, participants(name)')
    .eq('event_id', id);

  const responses = (data ?? []).map((r) => ({
    question_id: r.question_id as string,
    participant_id: r.participant_id as string,
    participant_name: ((r as { participants?: { name?: string } }).participants?.name) ?? '',
    value: (r as { value: unknown }).value,
  }));

  return NextResponse.json({ responses });
}
