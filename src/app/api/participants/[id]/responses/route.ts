import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { checkRateLimit } from '@/lib/rate-limit';
import { sanitizeResponseValue, type EventQuestion } from '@/lib/questions';

function isValidUUID(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}
function getIp(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown';
}

/** A participant's own saved answers (for pre-fill). */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isValidUUID(id)) return NextResponse.json({ error: 'Invalid participant ID' }, { status: 400 });
  const admin = createAdminClient();
  const { data } = await admin
    .from('question_responses')
    .select('question_id, value')
    .eq('participant_id', id);
  return NextResponse.json({ responses: data ?? [] });
}

/** Save/replace a participant's answers. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isValidUUID(id)) return NextResponse.json({ error: 'Invalid participant ID' }, { status: 400 });

  const { allowed } = checkRateLimit(getIp(request), 'save-responses', { limit: 60, windowSeconds: 3600 });
  if (!allowed) return NextResponse.json({ error: 'Too many requests. Try again later.' }, { status: 429 });

  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  const { event_id, responses } = body;
  if (!event_id || !isValidUUID(event_id)) return NextResponse.json({ error: 'Invalid event_id' }, { status: 400 });
  if (!Array.isArray(responses)) return NextResponse.json({ error: 'Invalid responses' }, { status: 400 });
  if (responses.length > 50) return NextResponse.json({ error: 'Too many responses' }, { status: 400 });

  const admin = createAdminClient();

  // Confirm the participant belongs to the event (prevents cross-event writes).
  const { data: participant } = await admin
    .from('participants').select('id').eq('id', id).eq('event_id', event_id).single();
  if (!participant) return NextResponse.json({ error: 'Participant not found' }, { status: 404 });

  // Only accept answers to this event's questions, and coerce each value to
  // something its question can actually hold (choice answers must be one of
  // the offered options; text is length-capped).
  const { data: qs } = await admin
    .from('event_questions')
    .select('id, type, label, options, required, position')
    .eq('event_id', event_id);
  const byId = new Map<string, EventQuestion>(
    (qs ?? []).map((q) => [q.id as string, q as EventQuestion]),
  );

  const rows = responses
    .filter((r: unknown): r is { question_id: string; value: unknown } =>
      !!r && typeof r === 'object' && typeof (r as { question_id?: unknown }).question_id === 'string')
    .map((r) => {
      const q = byId.get(r.question_id);
      if (!q) return null;
      return {
        event_id,
        participant_id: id,
        question_id: r.question_id,
        value: sanitizeResponseValue(q, r.value),
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  if (rows.length > 0) {
    const { error } = await admin
      .from('question_responses')
      .upsert(rows, { onConflict: 'question_id,participant_id' });
    if (error) return NextResponse.json({ error: 'Failed to save answers' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
