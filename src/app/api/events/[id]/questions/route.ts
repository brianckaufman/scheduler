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

/**
 * Organizer: save the whole question set for an event.
 *
 * Questions the client sends back with their existing `id` are UPDATED in
 * place, so the answers already collected against them survive. Only rows the
 * client genuinely dropped are deleted (taking their answers with them, which
 * is what deleting a question means).
 */
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

  // New questions may only use the three simple types. Existing rows keep
  // whatever type they were created with, so older events round-trip intact.
  for (const q of questions) {
    const hasId = typeof (q as { id?: unknown }).id === 'string';
    const t = (q as { type?: unknown }).type;
    if (!hasId && (t === 'long_text' || t === 'number' || t === 'yes_no')) {
      return NextResponse.json({ error: 'Invalid question type' }, { status: 400 });
    }
  }

  // Verify organizer.
  const supabase = await createClient();
  const { data: ev } = await supabase.from('events').select('organizer_token').eq('id', id).single();
  if (!ev || ev.organizer_token !== organizer_token) {
    return NextResponse.json({ error: 'Only the organizer can do this' }, { status: 403 });
  }

  const admin = createAdminClient();

  const { data: existingRows, error: exErr } = await admin
    .from('event_questions')
    .select('id')
    .eq('event_id', id);
  if (exErr) return NextResponse.json({ error: 'Failed to save questions' }, { status: 500 });
  const existingIds = new Set((existingRows ?? []).map((r) => r.id as string));

  // Which rows is the client still claiming? Read this from the RAW payload,
  // before sanitizing — otherwise a question that fails validation would look
  // like a deletion and cascade its collected answers away.
  const keepIds = new Set<string>();
  for (const q of questions) {
    const qid = (q as { id?: unknown }).id;
    if (typeof qid === 'string' && existingIds.has(qid)) keepIds.add(qid);
  }

  const clean = questions
    .map((q: unknown, i: number) => sanitizeQuestion(q, i, existingIds))
    .filter((q): q is NonNullable<typeof q> => q !== null);

  const toUpdate = clean.filter((q) => q.id).map((q) => ({ ...q, event_id: id }));
  const toInsert = clean.filter((q) => !q.id).map(({ id: _unused, ...q }) => ({ ...q, event_id: id }));
  const toDelete = [...existingIds].filter((eid) => !keepIds.has(eid));

  // Rows carrying an id upsert on the primary key — that's an UPDATE, so the
  // row survives and question_responses keeps pointing at it.
  if (toUpdate.length > 0) {
    const { error } = await admin.from('event_questions').upsert(toUpdate, { onConflict: 'id' });
    if (error) return NextResponse.json({ error: 'Failed to save questions' }, { status: 500 });
  }
  if (toInsert.length > 0) {
    const { error } = await admin.from('event_questions').insert(toInsert);
    if (error) return NextResponse.json({ error: 'Failed to save questions' }, { status: 500 });
  }
  if (toDelete.length > 0) {
    const { error } = await admin.from('event_questions').delete().in('id', toDelete);
    if (error) return NextResponse.json({ error: 'Failed to save questions' }, { status: 500 });
  }

  const { data } = await admin
    .from('event_questions')
    .select('id, type, label, options, required, position')
    .eq('event_id', id)
    .order('position', { ascending: true });
  return NextResponse.json({ questions: data ?? [] });
}
