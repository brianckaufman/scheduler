'use client';

import { useEffect, useMemo, useState } from 'react';
import Button from '@/components/ui/Button';
import QuestionListEditor from '@/components/questions/QuestionListEditor';
import {
  isLegacyType,
  validateQuestion,
  type EventQuestion,
  type QuestionDraft,
  type ResponseValue,
} from '@/lib/questions';

/** Strip the client-only React key so two draft lists compare cleanly. */
function fingerprint(drafts: QuestionDraft[]): string {
  return JSON.stringify(
    drafts.map(({ id, type, label, options, required }) => ({ id, type, label, options, required })),
  );
}

function toDrafts(qs: EventQuestion[]): QuestionDraft[] {
  return qs.map((q, i) => ({
    key: `saved-${q.id ?? i}`,
    id: q.id,
    type: q.type,
    label: q.label,
    options: Array.isArray(q.options) ? q.options : [],
    required: !!q.required,
  }));
}

/**
 * Organizer-side question builder: loads the saved set, hands it to the
 * presentational editor, and saves it back. Drafts keep their `id` so the API
 * updates rows in place rather than replacing them — which is what protects
 * the answers people have already given.
 */
export default function QuestionsEditor({
  eventId,
  organizerToken,
}: {
  eventId: string;
  organizerToken: string;
}) {
  const [drafts, setDrafts] = useState<QuestionDraft[]>([]);
  const [savedPrint, setSavedPrint] = useState('[]');
  const [answerCounts, setAnswerCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    fetch(`/api/events/${eventId}/questions`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        const next = toDrafts(d.questions ?? []);
        setDrafts(next);
        setSavedPrint(fingerprint(next));
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });

    // How many answers exist per question — drives the delete warning and locks
    // the answer style. Non-fatal: no counts simply means nothing is locked.
    fetch(`/api/events/${eventId}/responses?organizer_token=${encodeURIComponent(organizerToken)}`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        const counts: Record<string, number> = {};
        for (const row of (d.responses ?? []) as { question_id: string; value: ResponseValue }[]) {
          const v = row.value;
          const empty = v === null || v === undefined || v === '' || (Array.isArray(v) && v.length === 0);
          if (!empty) counts[row.question_id] = (counts[row.question_id] ?? 0) + 1;
        }
        setAnswerCounts(counts);
      })
      .catch(() => {});

    return () => { cancelled = true; };
  }, [eventId, organizerToken]);

  const invalidCount = useMemo(
    () => drafts.filter((d) => !isLegacyType(d.type) && validateQuestion(d) !== null).length,
    [drafts],
  );
  const dirty = fingerprint(drafts) !== savedPrint;

  const handleChange = (next: QuestionDraft[]) => {
    setDrafts(next);
    setSaved(false);
    setError('');
  };

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/events/${eventId}/questions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizer_token: organizerToken,
          questions: drafts.map(({ id, type, label, options, required }) => ({
            ...(id && { id }),
            type,
            label,
            options: options.map((o) => o.trim()).filter(Boolean),
            required,
          })),
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Could not save');
      const next = toDrafts(d.questions ?? []);
      setDrafts(next);
      setSavedPrint(fingerprint(next));
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-xs text-faint">Loading questions…</p>;

  return (
    <div className="space-y-3">
      <QuestionListEditor
        drafts={drafts}
        onChange={handleChange}
        answerCounts={answerCounts}
        accent="social"
      />

      {error && <p className="text-sm text-red-500">{error}</p>}

      {invalidCount > 0 && (
        <p className="text-sm text-red-500">
          Fix the highlighted question{invalidCount === 1 ? '' : 's'} above to save.
        </p>
      )}

      <Button
        variant="primary"
        accent="social"
        fullWidth
        loading={saving}
        disabled={invalidCount > 0 || !dirty}
        onClick={save}
      >
        {saved && !dirty ? 'Saved ✓' : 'Save questions'}
      </Button>
    </div>
  );
}
