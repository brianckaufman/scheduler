'use client';

import { useCallback, useEffect, useState } from 'react';
import Button from '@/components/ui/Button';
import ChoiceCard from '@/components/ui/ChoiceCard';
import { firstName } from '@/lib/names';
import {
  isAnswered,
  orphanValues,
  INLINE_OPTION_LIMIT,
  MAX_SHORT_TEXT,
  MAX_LONG_TEXT,
  type EventQuestion,
  type ResponseValue,
} from '@/lib/questions';

const FIELD =
  'w-full px-4 py-3 rounded-xl border-2 border-hairline bg-surface text-base text-heading min-h-[52px] focus:outline-none focus:ring-2 focus:ring-social-400 focus:border-transparent';

interface GuestQuestionsProps {
  eventId: string;
  participantId: string;
  questions: EventQuestion[];
  organizerName?: string | null;
  /** (allRequiredAnsweredOnTheServer, hasUnsavedEdits) */
  onStateChange?: (requiredMet: boolean, pending: boolean) => void;
}

/**
 * The host's custom questions, answered by a guest after they've responded.
 *
 * Two answer maps on purpose: `answers` is what's on screen (so the Save
 * button unlocks the moment they type), `savedAnswers` is what the server has
 * confirmed (so nothing upstream declares them "done" before the write lands).
 */
export default function GuestQuestions({
  eventId,
  participantId,
  questions,
  organizerName,
  onStateChange,
}: GuestQuestionsProps) {
  const [answers, setAnswers] = useState<Record<string, ResponseValue>>({});
  const [savedAnswers, setSavedAnswers] = useState<Record<string, ResponseValue>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/participants/${participantId}/responses`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        const map: Record<string, ResponseValue> = {};
        (d.responses ?? []).forEach((r: { question_id: string; value: ResponseValue }) => {
          map[r.question_id] = r.value;
        });
        setAnswers(map);
        setSavedAnswers(map);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [participantId]);

  // Required-state is judged against SAVED answers; "pending" against local edits.
  const requiredMet = questions.every((q) => !q.required || isAnswered(q, savedAnswers[q.id] ?? null));
  const pending = JSON.stringify(answers) !== JSON.stringify(savedAnswers);

  // Must sit above the empty-list early return, or an event with no questions
  // never reports and the done state upstream never resolves.
  useEffect(() => {
    onStateChange?.(requiredMet, pending);
  }, [requiredMet, pending, onStateChange]);

  const set = useCallback((qid: string, v: ResponseValue) => {
    setError('');
    setAnswers((a) => ({ ...a, [qid]: v }));
  }, []);

  if (questions.length === 0) return null;

  const missingRequired = questions.some((q) => q.required && !isAnswered(q, answers[q.id] ?? null));
  const requiredCount = questions.filter((q) => q.required).length;
  const allSaved = !pending;

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/participants/${participantId}/responses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_id: eventId,
          responses: questions.map((q) => ({ question_id: q.id, value: answers[q.id] ?? null })),
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error || 'Could not save your answers — check your connection.');
        return;
      }
      setSavedAnswers(answers);
    } catch {
      setError('Could not save your answers — check your connection.');
    } finally {
      setSaving(false);
    }
  };

  function renderInput(q: EventQuestion) {
    const v = answers[q.id];
    switch (q.type) {
      case 'long_text':
        return (
          <textarea
            value={typeof v === 'string' ? v : ''}
            onChange={(e) => set(q.id, e.target.value)}
            rows={3}
            className={`${FIELD} resize-none`}
            maxLength={MAX_LONG_TEXT}
          />
        );
      case 'number':
        return (
          <input
            type="number"
            inputMode="numeric"
            value={v == null || v === '' ? '' : String(v)}
            onChange={(e) => set(q.id, e.target.value === '' ? null : Number(e.target.value))}
            className={FIELD}
          />
        );
      case 'yes_no':
        return (
          <div className="grid grid-cols-2 gap-2">
            {([['Yes', true], ['No', false]] as const).map(([label, val]) => (
              <ChoiceCard
                key={label}
                compact
                accent="social"
                title={label}
                selected={v === val}
                onClick={() => set(q.id, val)}
              />
            ))}
          </div>
        );
      case 'single_select': {
        // Few options read best as buttons; a long list is far easier as the
        // phone's native picker. The organizer never had to choose.
        if (q.options.length <= INLINE_OPTION_LIMIT) {
          return (
            <div className="space-y-2">
              {q.options.map((o) => (
                <ChoiceCard
                  key={o}
                  compact
                  accent="social"
                  title={o}
                  selected={v === o}
                  onClick={() => set(q.id, v === o && !q.required ? null : o)}
                />
              ))}
            </div>
          );
        }
        return (
          <select
            value={typeof v === 'string' ? v : ''}
            onChange={(e) => set(q.id, e.target.value || null)}
            className={`${FIELD} cursor-pointer`}
          >
            <option value="">Select…</option>
            {q.options.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        );
      }
      case 'multi_select': {
        const arr = Array.isArray(v) ? v : [];
        return (
          <div className="space-y-2">
            {q.options.map((o) => {
              const on = arr.includes(o);
              return (
                <label
                  key={o}
                  className={`flex items-center gap-3 rounded-2xl border-2 p-4 min-h-[56px] cursor-pointer transition-colors ${
                    on
                      ? 'border-social-500 bg-social-50 dark:bg-social-500/10'
                      : 'border-hairline bg-surface hover:border-strong'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() => set(q.id, on ? arr.filter((x) => x !== o) : [...arr, o])}
                    className="h-6 w-6 rounded border-strong accent-social-500 shrink-0 cursor-pointer"
                  />
                  <span className="text-base text-heading">{o}</span>
                </label>
              );
            })}
          </div>
        );
      }
      default:
        return (
          <input
            type="text"
            value={typeof v === 'string' ? v : ''}
            onChange={(e) => set(q.id, e.target.value)}
            className={FIELD}
            maxLength={MAX_SHORT_TEXT}
          />
        );
    }
  }

  const host = organizerName ? firstName(organizerName) : 'the organizer';

  return (
    <div className="rounded-2xl border-2 border-social-200 dark:border-social-500/30 bg-surface p-4 space-y-5 animate-fade-in">
      <div>
        <h3 className="text-base font-bold text-heading">
          One more thing — {host} {questions.length === 1 ? 'has a question' : `has ${questions.length} questions`}
        </h3>
        {requiredCount > 0 && (
          <p className="text-sm text-muted mt-0.5">
            Answer the question{requiredCount === 1 ? '' : 's'} marked Required to finish.
          </p>
        )}
      </div>

      {questions.map((q) => {
        const orphans = orphanValues(q, answers[q.id] ?? null);
        return (
          <div key={q.id}>
            <div className="flex items-start gap-2 mb-2">
              <label className="block text-base font-semibold text-heading flex-1">{q.label}</label>
              {q.required && (
                <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 mt-1">
                  Required
                </span>
              )}
            </div>
            {orphans.length > 0 && (
              <p className="text-sm text-amber-600 dark:text-amber-400 mb-2">
                Your earlier answer ({orphans.join(', ')}) is no longer offered — please choose again.
              </p>
            )}
            {renderInput(q)}
          </div>
        );
      })}

      {error && <p className="text-sm text-red-500 font-medium">{error}</p>}

      <div>
        <Button
          variant="primary"
          accent="social"
          size="lg"
          fullWidth
          loading={saving}
          disabled={missingRequired || (allSaved && !saving)}
          onClick={save}
        >
          {allSaved && !missingRequired ? (
            <>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Answers saved
            </>
          ) : (
            'Save my answers'
          )}
        </Button>
        {missingRequired && (
          <p className="text-xs text-center text-faint mt-1.5">
            Answer the question{requiredCount === 1 ? '' : 's'} marked Required to finish.
          </p>
        )}
      </div>
    </div>
  );
}
