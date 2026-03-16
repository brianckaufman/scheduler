import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateSlug, generateToken } from '@/lib/nanoid';
import { checkRateLimit } from '@/lib/rate-limit';
import { sanitizeText, sanitizeName, isValidTime, isValidDate, isValidTimezone } from '@/lib/sanitize';

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

export async function POST(request: NextRequest) {
  // Rate limit: 10 events per IP per hour
  const ip = getClientIp(request);
  const { allowed, remaining } = checkRateLimit(ip, 'create-event', {
    limit: 10,
    windowSeconds: 3600,
  });

  if (!allowed) {
    return NextResponse.json(
      { error: 'Too many events created. Please try again later.' },
      {
        status: 429,
        headers: { 'Retry-After': '3600', 'X-RateLimit-Remaining': '0' },
      }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { name, description, organizerName, location, durationMinutes, responseDeadline, maxParticipants, dates, timeStart, timeEnd, timezone } = body;

  // --- Input validation ---
  if (!name || typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ error: 'Event name is required' }, { status: 400 });
  }

  if (!Array.isArray(dates) || dates.length === 0 || dates.length > 31) {
    return NextResponse.json({ error: 'Select between 1 and 31 dates' }, { status: 400 });
  }

  for (const d of dates) {
    if (!isValidDate(d)) {
      return NextResponse.json({ error: `Invalid date: ${d}` }, { status: 400 });
    }
  }

  if (!timeStart || !timeEnd || !isValidTime(timeStart) || !isValidTime(timeEnd)) {
    return NextResponse.json({ error: 'Valid start and end times are required' }, { status: 400 });
  }

  if (timeStart >= timeEnd) {
    return NextResponse.json({ error: 'End time must be after start time' }, { status: 400 });
  }

  if (timezone && !isValidTimezone(timezone)) {
    return NextResponse.json({ error: 'Invalid timezone' }, { status: 400 });
  }

  const validDurations = [10, 15, 30, 45, 60, 90, 120, 180, 240];
  const safeDuration = validDurations.includes(durationMinutes) ? durationMinutes : 30;

  // Validate max participants (optional)
  let safeMaxParticipants: number | null = null;
  if (maxParticipants !== undefined && maxParticipants !== null && maxParticipants !== '' && maxParticipants !== 0) {
    const num = Number(maxParticipants);
    if (Number.isInteger(num) && num >= 2 && num <= 1000) {
      safeMaxParticipants = num;
    }
  }

  // --- Sanitize text inputs ---
  const safeName = sanitizeText(name, 100);
  const safeDescription = description ? sanitizeText(description, 500) : null;
  const safeOrganizerName = organizerName ? sanitizeName(organizerName) : null;
  const safeLocation = location ? sanitizeText(location, 100) : null;

  if (!safeName) {
    return NextResponse.json({ error: 'Event name is required' }, { status: 400 });
  }

  const supabase = await createClient();
  const slug = generateSlug();
  const organizerToken = generateToken();

  const { data, error } = await supabase
    .from('events')
    .insert({
      slug,
      name: safeName,
      description: safeDescription,
      organizer_name: safeOrganizerName,
      location: safeLocation,
      duration_minutes: safeDuration,
      response_deadline: responseDeadline || null,
      max_participants: safeMaxParticipants,
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
  if (safeOrganizerName) {
    const { data: participant } = await supabase
      .from('participants')
      .insert({ event_id: data.id, name: safeOrganizerName })
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
    organizerName: safeOrganizerName,
  }, {
    status: 201,
    headers: { 'X-RateLimit-Remaining': String(remaining) },
  });
}
