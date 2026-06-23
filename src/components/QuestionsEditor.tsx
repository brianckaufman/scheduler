'use client';

import { useEffect, useState } from 'react';
import { QUESTION_TYPES, needsOptions, type EventQuestion, type QuestionType } from '@/lib/questions';

type Draft = Pick<EventQuestion, 'type' | 'label' | 'options' | 'required'>;

const blank: Draft = { type: 'short_text', label: '', options: [], required: false };

/**
 * Organizer-facing custom-question builder (lives in the Customize panel).
 * Self-saving: loads the current set, edits locally, PUTs the whole set.
 */
export default function QuestionsEditor({ eventId, organizerToken }: { eventId: string; organizerToken: string }) {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/events/${eventId}/questions`)
      .then((r) => r.json())
      .then((d) => setDrafts((d.questions ?? []).map((q: EventQuestion) => ({ type: q.type, label: q.label, options: q.options ?? [], required: q.required }))))
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, [eventId]);

  const update = (i: number, patch: Partial<Draft>) =>
    setDrafts((d) => d.map((q, j) => (j === i ? { ...q, ...patch } : q)));
  const remove = (i: number) => setDrafts((d) => d.filter((_, j) => j !== i));
  const add = () => setDrafts((d) => [...d, { ...blank }]);

  const save = async () => {
    setSaving(true); setError(''); setSaved(false);
    try {
      const res = await fetch(`/api/events/${eventId}/questions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizer_token: organizerToken, questions: drafts }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error || 'Could not save'); return; }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch { setError('Could not save'); } finally { setSaving(false); }
  };

  if (!loaded) return <p className="text-xs text-faint">Loading questions…</p>;

  const fieldClass = 'w-full px-3 py-2 rounded-field border border-hairline bg-surface text-sm text-heading focus:outline-none focus:ring-2 focus:ring-social-500';

  return (
    <div className="space-y-3">
      {drafts.map((q, i) => (
        <div key={i} className="rounded-card border border-hairline-soft p-3 space-y-2 bg-subtle">
          <div className="flex items-center gap-2">
            <input
              value={q.label}
              onChange={(e) => update(i, { label: e.target.value })}
              placeholder="Question (e.g. Any dietary needs?)"
              className={`${fieldClass} flex-1`}
              maxLength={200}
            />
            <button type="button" onClick={() => remove(i)} className="text-xs text-faint hover:text-red-500 shrink-0 cursor-pointer">Remove</button>
          </div>
          <div className="flex items-center gap-2">
            <select value={q.type} onChange={(e) => update(i, { type: e.target.value as QuestionType })} className={`${fieldClass} flex-1`}>
              {QUESTION_TYPES.map((t) => <option key={t.type} value={t.type}>{t.label}</option>)}
            </select>
            <label className="flex items-center gap-1.5 text-xs text-secondary cursor-pointer shrink-0">
              <input type="checkbox" checked={q.required} onChange={(e) => update(i, { required: e.target.checked })} className="h-4 w-4 rounded border-strong accent-social-500 cursor-pointer" />
              Required
            </label>
          </div>
          {needsOptions(q.type) && (
            <textarea
              value={q.options.join('\n')}
              onChange={(e) => update(i, { options: e.target.value.split('\n') })}
              placeholder="One choice per line"
              rows={3}
              className={`${fieldClass} resize-none`}
            />
          )}
        </div>
      ))}

      <div className="flex items-center justify-between">
        <button type="button" onClick={add} className="text-xs font-semibold text-accent-fg hover:underline cursor-pointer">+ Add question</button>
        <div className="flex items-center gap-3">
          {error && <span className="text-xs text-red-500">{error}</span>}
          {saved && <span className="text-xs text-success-fg">Saved</span>}
          <button type="button" onClick={save} disabled={saving} className="text-xs font-semibold px-3 py-1.5 rounded-field bg-social-500 text-white hover:bg-social-600 disabled:opacity-50 cursor-pointer">
            {saving ? 'Saving…' : 'Save questions'}
          </button>
        </div>
      </div>
    </div>
  );
}
