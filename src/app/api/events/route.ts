import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateSlug, generateToken } from '@/lib/nanoid';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, description, organizerName, location, durationMinutes, responseDeadline, dates, timeStart, timeEnd, timezone } = body;

  if (!name || !dates?.length || !timeStart || !timeEnd) {
    return NextResponse.json(
      { error: 'Missing required fields' },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const slug = generateSlug();
  const organizerToken = generateToken();

  const { data, error } = await supabase
    .from('events')
    .insert({
      slug,
      name,
      description: description || null,
      organizer_name: organizerName || null,
      location: location || null,
      duration_minutes: durationMinutes || 30,
      response_deadline: responseDeadline || null,
      organizer_token: organizerToken,
      dates,
      time_start: timeStart,
      time_end: timeEnd,
      timezone: timezone || 'UTC',
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Auto-add the organizer as a participant if they provided their name
  let organizerParticipantId: string | null = null;
  if (organizerName?.trim()) {
    const { data: participant } = await supabase
      .from('participants')
      .insert({ event_id: data.id, name: organizerName.trim() })
      .select('id')
      .single();
    if (participant) {
      organizerParticipantId = participant.id;
    }
  }

  return NextResponse.json({
    slug: data.slug,
    organizerToken,
    organizerParticipantId,
    organizerName: organizerName?.trim() || null,
  }, { status: 201 });
}
