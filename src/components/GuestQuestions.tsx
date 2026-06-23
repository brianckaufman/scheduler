'use client';

import { useEffect, useState } from 'react';
import { isAnswered, type EventQuestion, type ResponseValue } from '@/lib/questions';

const FIELD = 'w-full px-3 py-2.5 rounded-field border border-hairline bg-surface text-sm text-heading focus:outline-none focus:ring-2 focus:ring-social-500';

/** Guest answers the host's custom questions; pre-fills prior answers. */
export default function GuestQuestions({
  eventId,
  participantId,
  questions,
}: {
  eventId: string;
  participantId: string;
  questions: EventQuestion[];
}) {
  const [answers, setAnswers] = useState<Record<string, ResponseValue>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/participants/${participantId}/responses`)
      .then((r) => r.json())
      .then((d) => {
        const map: Record<string, ResponseValue> = {};
        (d.responses ?? []).forEach((r: { question_id: string; value: ResponseValue }) => { map[r.question_id] = r.value; });
        setAnswers(map);
      })
      .catch(() => {});
  }, [participantId]);

  if (questions.length === 0) return null;

  const set = (qid: string, v: ResponseValue) => { setSaved(false); setAnswers((a) => ({ ...a, [qid]: v })); };
  const missingRequired = questions.some((q) => q.required && !isAnswered(q, answers[q.id] ?? null));

  const save = async () => {
    setSaving(true); setError('');
    try {
      const res = await fetch(`/api/participants/${participantId}/responses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_id: eventId, responses: questions.map((q) => ({ question_id: q.id, value: answers[q.id] ?? null })) }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error || 'Could not save'); return; }
      setSaved(true); setTimeout(() => setSaved(false), 2000);
    } catch { setError('Could not save'); } finally { setSaving(false); }
  };

  function renderInput(q: EventQuestion) {
    const v = answers[q.id];
    switch (q.type) {
      case 'long_text':
        return <textarea value={typeof v === 'string' ? v : ''} onChange={(e) => set(q.id, e.target.value)} rows={3} className={`${FIELD} resize-none`} maxLength={1000} />;
      case 'number':
        return <input type="number" value={v == null || v === '' ? '' : String(v)} onChange={(e) => set(q.id, e.target.value === '' ? null : Number(e.target.value))} className={FIELD} />;
      case 'yes_no':
        return (
          <div className="flex gap-2">
            {([['Yes', true], ['No', false]] as const).map(([label, val]) => (
              <button key={label} type="button" onClick={() => set(q.id, val)}
                className={`px-4 py-2 rounded-field border text-sm font-medium cursor-pointer transition-colors ${v === val ? 'bg-social-500 text-white border-social-500' : 'border-hairline text-secondary hover:bg-subtle'}`}>
                {label}
              </button>
            ))}
          </div>
        );
      case 'single_select':
        return (
          <select value={typeof v === 'string' ? v : ''} onChange={(e) => set(q.id, e.target.value)} className={FIELD}>
            <option value="">Select…</option>
            {q.options.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        );
      case 'multi_select': {
        const arr = Array.isArray(v) ? v : [];
        return (
          <div className="flex flex-wrap gap-2">
            {q.options.map((o) => {
              const on = arr.includes(o);
              return (
                <button key={o} type="button" onClick={() => set(q.id, on ? arr.filter((x) => x !== o) : [...arr, o])}
                  className={`px-3 py-1.5 rounded-full border text-sm font-medium cursor-pointer transition-colors ${on ? 'bg-social-500 text-white border-social-500' : 'border-hairline text-secondary hover:bg-subtle'}`}>
                  {o}
                </button>
              );
            })}
          </div>
        );
      }
      default:
        return <input value={typeof v === 'string' ? v : ''} onChange={(e) => set(q.id, e.target.value)} className={FIELD} maxLength={300} />;
    }
  }

  return (
    <div className="border-t border-hairline-soft pt-4 space-y-4 animate-fade-in">
      <p className="text-sm font-semibold text-body">A few questions</p>
      {questions.map((q) => (
        <div key={q.id}>
          <label className="block text-sm font-medium text-body mb-1.5">
            {q.label}{q.required && <span className="text-red-500 ml-0.5">*</span>}
          </label>
          {renderInput(q)}
        </div>
      ))}
      <div className="flex items-center gap-3">
        <button type="button" onClick={save} disabled={saving || missingRequired}
          className="px-4 py-2 rounded-field bg-social-500 text-white text-sm font-semibold hover:bg-social-600 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">
          {saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save answers'}
        </button>
        {error && <span className="text-xs text-red-500">{error}</span>}
      </div>
    </div>
  );
}
