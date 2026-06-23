import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { checkRateLimit } from '@/lib/rate-limit';
import { sanitizeQuestion } from '@/lib/questions';

function isValidUUID(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}
function getIp(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown';
}

/** Public: list an event's questions, ordered. */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isValidUUID(id)) return NextResponse.json({ error: 'Invalid event ID' }, { status: 400 });
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('event_questions')
    .select('id, type, label, options, required, position')
    .eq('event_id', id)
    .order('position', { ascending: true });
  if (error) return NextResponse.json({ questions: [] });
  return NextResponse.json({ questions: data ?? [] });
}

/** Organizer: replace the whole question set for an event. */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isValidUUID(id)) return NextResponse.json({ error: 'Invalid event ID' }, { status: 400 });

  const { allowed } = checkRateLimit(getIp(request), 'edit-questions', { limit: 60, windowSeconds: 3600 });
  if (!allowed) return NextResponse.json({ error: 'Too many requests. Try again later.' }, { status: 429 });

  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  const { organizer_token, questions } = body;
  if (!organizer_token || typeof organizer_token !== 'string') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!Array.isArray(questions) || questions.length > 25) {
    return NextResponse.json({ error: 'Invalid questions' }, { status: 400 });
  }

  // Verify organizer.
  const supabase = await createClient();
  const { data: ev } = await supabase.from('events').select('organizer_token').eq('id', id).single();
  if (!ev || ev.organizer_token !== organizer_token) {
    return NextResponse.json({ error: 'Only the organizer can do this' }, { status: 403 });
  }

  const clean = questions
    .map((q: unknown, i: number) => sanitizeQuestion(q, i))
    .filter((q): q is NonNullable<typeof q> => q !== null)
    .map((q) => ({ ...q, event_id: id }));

  // Replace the set (responses cascade-delete with removed questions).
  const admin = createAdminClient();
  const { error: delErr } = await admin.from('event_questions').delete().eq('event_id', id);
  if (delErr) return NextResponse.json({ error: 'Failed to save questions' }, { status: 500 });
  if (clean.length > 0) {
    const { error: insErr } = await admin.from('event_questions').insert(clean);
    if (insErr) return NextResponse.json({ error: 'Failed to save questions' }, { status: 500 });
  }

  const { data } = await admin
    .from('event_questions')
    .select('id, type, label, options, required, position')
    .eq('event_id', id)
    .order('position', { ascending: true });
  return NextResponse.json({ questions: data ?? [] });
}
