'use client';

import ChoiceCard from '@/components/ui/ChoiceCard';
import Button from '@/components/ui/Button';
import { IconChip } from '@/components/ui/IconChip';
import { PlusIcon } from '@/components/ui/icons';
import {
  SIMPLE_TYPES,
  MAX_QUESTIONS,
  MAX_OPTIONS,
  MAX_LABEL,
  MAX_OPTION_LEN,
  INLINE_OPTION_LIMIT,
  needsOptions,
  toStorageType,
  toSimpleType,
  isLegacyType,
  legacyTypeLabel,
  validateQuestion,
  type QuestionDraft,
} from '@/lib/questions';

interface QuestionListEditorProps {
  drafts: QuestionDraft[];
  onChange: (next: QuestionDraft[]) => void;
  /** questionId → answers collected. Locks the answer style and warns before deleting. */
  answerCounts?: Record<string, number>;
  accent?: 'social' | 'teal';
  max?: number;
}

let seq = 0;
export function newQuestionDraft(partial?: Partial<QuestionDraft>): QuestionDraft {
  seq += 1;
  return {
    key: `q-${seq}-${Math.round(performance.now())}`,
    type: 'short_text',
    label: '',
    options: [],
    required: false,
    ...partial,
  };
}

const inputClass =
  'w-full px-4 py-3 rounded-xl border-2 border-hairline bg-surface focus:outline-none focus:ring-2 focus:ring-social-400 focus:border-transparent text-base text-heading placeholder-faint';

/**
 * The question builder. Deliberately offers three answer styles and decides
 * the widget itself — a creator should never have to know the difference
 * between a radio group and a drop-down.
 */
export default function QuestionListEditor({
  drafts,
  onChange,
  answerCounts,
  accent = 'social',
  max = MAX_QUESTIONS,
}: QuestionListEditorProps) {
  const patch = (i: number, next: Partial<QuestionDraft>) => {
    onChange(drafts.map((d, idx) => (idx === i ? { ...d, ...next } : d)));
  };

  const removeAt = (i: number) => {
    const d = drafts[i];
    const answered = d.id ? answerCounts?.[d.id] ?? 0 : 0;
    if (answered > 0) {
      const ok = window.confirm(
        `Delete "${d.label || 'this question'}"?\n\nThe ${answered} answer${answered === 1 ? '' : 's'} already given will be deleted too.`,
      );
      if (!ok) return;
    }
    onChange(drafts.filter((_, idx) => idx !== i));
  };

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= drafts.length) return;
    const next = [...drafts];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  const setType = (i: number, simple: (typeof SIMPLE_TYPES)[number]['type']) => {
    const storage = toStorageType(simple);
    const d = drafts[i];
    // Seed two blank choices so the choices editor is never empty.
    const options = needsOptions(storage) && d.options.length < 2 ? ['', ''] : d.options;
    patch(i, { type: storage, options });
  };

  const setOption = (i: number, oi: number, value: string) => {
    patch(i, { options: drafts[i].options.map((o, idx) => (idx === oi ? value : o)) });
  };

  if (drafts.length === 0) {
    return (
      <div className="space-y-4">
        <div className="text-center py-6 px-4 rounded-2xl border-2 border-dashed border-hairline">
          <div className="flex justify-center mb-3">
            <IconChip size="lg"><PlusIcon /></IconChip>
          </div>
          <p className="text-sm font-semibold text-heading">No questions yet</p>
          <p className="text-sm text-muted mt-1 leading-relaxed">
            Ask your guests anything — dietary needs, a plus-one, a song request.
          </p>
        </div>
        <Button variant="outline" accent={accent} fullWidth onClick={() => onChange([newQuestionDraft()])}>
          + Add a question
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {drafts.map((d, i) => {
        const legacy = isLegacyType(d.type);
        const errors = legacy ? null : validateQuestion(d);
        const answered = d.id ? answerCounts?.[d.id] ?? 0 : 0;
        const locked = answered > 0;
        const optionCount = d.options.filter((o) => o.trim()).length;

        return (
          <div key={d.key} className="rounded-2xl border border-hairline-soft bg-subtle p-4 space-y-4">
            {/* Header: position + reorder + remove */}
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-faint">
                Question {i + 1}
              </p>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  aria-label="Move up"
                  disabled={i === 0}
                  onClick={() => move(i, -1)}
                  className="min-w-11 min-h-11 flex items-center justify-center rounded-xl border border-hairline bg-surface text-secondary hover:bg-fill disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                  </svg>
                </button>
                <button
                  type="button"
                  aria-label="Move down"
                  disabled={i === drafts.length - 1}
                  onClick={() => move(i, 1)}
                  className="min-w-11 min-h-11 flex items-center justify-center rounded-xl border border-hairline bg-surface text-secondary hover:bg-fill disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <Button variant="secondary" onClick={() => removeAt(i)}>Remove</Button>
              </div>
            </div>

            {legacy ? (
              /* Older answer styles are no longer offered, but existing ones stay
                 intact — read-only here so a save can never silently rewrite them. */
              <div className="space-y-2">
                <p className="text-base font-medium text-heading">{d.label}</p>
                <p className="text-xs text-faint">
                  <span className="inline-block px-1.5 py-0.5 rounded bg-fill2 font-semibold mr-1.5">
                    Older question
                  </span>
                  {legacyTypeLabel(d.type)}{d.required ? ' · Required' : ''}
                </p>
                {d.options.length > 0 && (
                  <p className="text-xs text-muted">{d.options.join(' · ')}</p>
                )}
                <p className="text-xs text-faint leading-relaxed">
                  This question uses an older answer style. You can keep it, move it, or remove it.
                </p>
              </div>
            ) : (
              <>
                {/* Label */}
                <div>
                  <input
                    type="text"
                    value={d.label}
                    onChange={(e) => patch(i, { label: e.target.value })}
                    placeholder="Any food allergies?"
                    maxLength={MAX_LABEL}
                    className={inputClass}
                  />
                  {errors?.label && <p className="text-sm text-red-500 mt-1.5">{errors.label}</p>}
                </div>

                {/* Answer style */}
                <div>
                  <p className="text-sm font-semibold text-body mb-2">How should people answer?</p>
                  {locked ? (
                    <p className="text-sm text-muted leading-relaxed">
                      <span className="font-medium text-heading">
                        {SIMPLE_TYPES.find((t) => t.type === toSimpleType(d.type))?.title}
                      </span>
                      {' — '}
                      to change this, delete the question and add a new one
                      {' '}({answered} {answered === 1 ? 'person has' : 'people have'} already answered).
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {SIMPLE_TYPES.map((t) => (
                        <ChoiceCard
                          key={t.type}
                          compact
                          accent={accent}
                          title={t.title}
                          description={t.description}
                          selected={toSimpleType(d.type) === t.type}
                          onClick={() => setType(i, t.type)}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Choices */}
                {needsOptions(d.type) && (
                  <div>
                    <p className="text-sm font-semibold text-body mb-2">Choices</p>
                    <div className="space-y-2">
                      {d.options.map((o, oi) => (
                        <div key={oi} className="flex items-center gap-2">
                          <input
                            type="text"
                            value={o}
                            onChange={(e) => setOption(i, oi, e.target.value)}
                            placeholder={`Choice ${oi + 1}`}
                            maxLength={MAX_OPTION_LEN}
                            className={`flex-1 min-w-0 ${inputClass}`}
                          />
                          <button
                            type="button"
                            aria-label="Remove this choice"
                            disabled={d.options.length <= 2}
                            onClick={() => patch(i, { options: d.options.filter((_, idx) => idx !== oi) })}
                            className="min-w-11 min-h-11 flex items-center justify-center rounded-xl border border-hairline bg-surface text-faint hover:text-red-500 hover:bg-fill disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer shrink-0"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                    {errors?.options && <p className="text-sm text-red-500 mt-1.5">{errors.options}</p>}
                    {d.options.length < MAX_OPTIONS && (
                      <Button
                        variant="outline"
                        accent={accent}
                        fullWidth
                        className="mt-2"
                        onClick={() => patch(i, { options: [...d.options, ''] })}
                      >
                        + Add a choice
                      </Button>
                    )}
                    {optionCount >= 2 && (
                      <p className="text-xs text-faint mt-2">
                        Guests will see{' '}
                        {optionCount <= INLINE_OPTION_LIMIT ? 'big buttons for each choice' : 'a drop-down list'}.
                      </p>
                    )}
                  </div>
                )}

                {/* Required */}
                <ChoiceCard
                  compact
                  accent={accent}
                  title="They must answer this"
                  description="Guests can't finish until they answer."
                  selected={d.required}
                  onClick={() => patch(i, { required: !d.required })}
                />
              </>
            )}
          </div>
        );
      })}

      {drafts.length < max ? (
        <Button
          variant="outline"
          accent={accent}
          fullWidth
          onClick={() => onChange([...drafts, newQuestionDraft()])}
        >
          + Add a question
        </Button>
      ) : (
        <p className="text-xs text-faint text-center">That&apos;s the maximum of {max} questions.</p>
      )}
    </div>
  );
}
