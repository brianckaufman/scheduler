// Polished Pro — custom questions (the generalized "dietary / notes" field).

export type QuestionType =
  | 'short_text'
  | 'long_text'
  | 'single_select'
  | 'multi_select'
  | 'number'
  | 'yes_no';

export interface EventQuestion {
  id: string;
  event_id?: string;
  type: QuestionType;
  label: string;
  options: string[];
  required: boolean;
  position: number;
}

export type ResponseValue = string | string[] | number | boolean | null;

export interface QuestionResponse {
  question_id: string;
  value: ResponseValue;
}

export const QUESTION_TYPES: { type: QuestionType; label: string }[] = [
  { type: 'short_text', label: 'Short text' },
  { type: 'long_text', label: 'Paragraph' },
  { type: 'single_select', label: 'Single choice' },
  { type: 'multi_select', label: 'Multiple choice' },
  { type: 'number', label: 'Number' },
  { type: 'yes_no', label: 'Yes / No' },
];

const VALID_TYPES = QUESTION_TYPES.map((t) => t.type);

export function isQuestionType(v: unknown): v is QuestionType {
  return typeof v === 'string' && (VALID_TYPES as string[]).includes(v);
}

export function needsOptions(t: QuestionType): boolean {
  return t === 'single_select' || t === 'multi_select';
}

// ── The three answer styles a creator can choose ────────────────────────────
// Deliberately fewer than the storage types: "pick one" is one idea, and
// whether it looks like buttons or a drop-down is decided for the creator by
// option count. Storage keeps the original names so nothing needs migrating.

export type SimpleType = 'pick_one' | 'pick_many' | 'short_text';

export const SIMPLE_TYPES: { type: SimpleType; title: string; description: string }[] = [
  { type: 'pick_one', title: 'Pick one', description: 'They choose a single answer.' },
  { type: 'pick_many', title: 'Pick any', description: 'They can choose more than one.' },
  { type: 'short_text', title: 'Type an answer', description: 'One short line of text.' },
];

export function toStorageType(t: SimpleType): QuestionType {
  if (t === 'pick_one') return 'single_select';
  if (t === 'pick_many') return 'multi_select';
  return 'short_text';
}

/** null for the legacy types the builder no longer offers (they stay editable-in-place only). */
export function toSimpleType(t: QuestionType): SimpleType | null {
  if (t === 'single_select') return 'pick_one';
  if (t === 'multi_select') return 'pick_many';
  if (t === 'short_text') return 'short_text';
  return null;
}

export function isLegacyType(t: QuestionType): boolean {
  return toSimpleType(t) === null;
}

export function legacyTypeLabel(t: QuestionType): string {
  return QUESTION_TYPES.find((x) => x.type === t)?.label ?? 'Question';
}

/** Choice questions with more than this many options render as a drop-down. */
export const INLINE_OPTION_LIMIT = 5;

// Client-side caps. The server stays more permissive (25 questions / 20
// options) so an older, larger question set still loads and re-saves intact.
export const MAX_QUESTIONS = 5;
export const MAX_OPTIONS = 10;
export const MAX_LABEL = 200;
export const MAX_OPTION_LEN = 100;
export const MAX_SHORT_TEXT = 300;
export const MAX_LONG_TEXT = 1000;

/** A question being edited. `id` present ⇒ the row already exists server-side. */
export interface QuestionDraft {
  /** Stable React key; never sent to the server. */
  key: string;
  id?: string;
  type: QuestionType;
  label: string;
  options: string[];
  required: boolean;
}

export interface QuestionErrors {
  label?: string;
  options?: string;
}

/** Returns null when the draft is savable. Plain-language messages — guests never see these, creators do. */
export function validateQuestion(d: Pick<QuestionDraft, 'type' | 'label' | 'options'>): QuestionErrors | null {
  const errors: QuestionErrors = {};
  if (!d.label.trim()) errors.label = 'Type your question here.';
  if (needsOptions(d.type)) {
    const filled = d.options.map((o) => o.trim()).filter(Boolean);
    if (filled.length < 2) {
      errors.options = 'Add at least 2 choices.';
    } else {
      const seen = new Set<string>();
      for (const o of filled) {
        const k = o.toLowerCase();
        if (seen.has(k)) {
          errors.options = 'Two choices are the same — make them different.';
          break;
        }
        seen.add(k);
      }
    }
  }
  return errors.label || errors.options ? errors : null;
}

/**
 * Has the guest provided an acceptable answer for a required question?
 * Choice answers only count when the value is still an offered option — an
 * option the organizer has since deleted must not silently satisfy a required
 * question (the server would null it on the next save anyway).
 */
export function isAnswered(q: EventQuestion, value: ResponseValue): boolean {
  if (q.type === 'multi_select') {
    return Array.isArray(value) && value.some((v) => q.options.includes(v));
  }
  if (q.type === 'single_select') {
    return typeof value === 'string' && q.options.includes(value);
  }
  if (q.type === 'yes_no') return value === true || value === false;
  if (q.type === 'number') return value !== null && value !== '' && !Number.isNaN(Number(value));
  return typeof value === 'string' ? value.trim().length > 0 : value != null;
}

/** Saved choice values that are no longer offered, so the guest can be asked to re-pick. */
export function orphanValues(q: EventQuestion, value: ResponseValue): string[] {
  if (!needsOptions(q.type)) return [];
  if (q.type === 'multi_select') {
    return Array.isArray(value) ? value.filter((v) => typeof v === 'string' && !q.options.includes(v)) : [];
  }
  return typeof value === 'string' && value && !q.options.includes(value) ? [value] : [];
}

/**
 * Server-side: coerce/clean an incoming question definition. Returns null if invalid.
 * `allowedIds` is the set of question ids that genuinely belong to this event —
 * an id outside it is dropped so a forged payload can't update another event's row.
 */
export function sanitizeQuestion(
  input: unknown,
  position: number,
  allowedIds?: Set<string>,
): (Omit<EventQuestion, 'id'> & { id?: string }) | null {
  if (!input || typeof input !== 'object') return null;
  const o = input as Record<string, unknown>;
  if (!isQuestionType(o.type)) return null;
  const label = typeof o.label === 'string' ? o.label.trim().slice(0, MAX_LABEL) : '';
  if (!label) return null;
  let options: string[] = [];
  if (needsOptions(o.type) && Array.isArray(o.options)) {
    const seen = new Set<string>();
    options = o.options
      .filter((x): x is string => typeof x === 'string')
      .map((x) => x.trim().slice(0, MAX_OPTION_LEN))
      .filter((x) => {
        if (!x) return false;
        const k = x.toLowerCase();
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      })
      .slice(0, 20);
  }
  // Deliberately 1, not 2: the "at least 2 choices" rule is a builder-side
  // rule. Rejecting a pre-existing 1-option question here would make it
  // sanitize to null and read as a deletion, cascading its answers away.
  if (needsOptions(o.type) && options.length < 1) return null;
  const id = typeof o.id === 'string' && allowedIds?.has(o.id) ? o.id : undefined;
  return { ...(id && { id }), type: o.type, label, options, required: o.required === true, position };
}

/** Server-side: coerce one incoming answer to something its question can actually hold. */
export function sanitizeResponseValue(q: EventQuestion, raw: unknown): ResponseValue {
  switch (q.type) {
    case 'short_text':
      return typeof raw === 'string' && raw.trim() ? raw.trim().slice(0, MAX_SHORT_TEXT) : null;
    case 'long_text':
      return typeof raw === 'string' && raw.trim() ? raw.trim().slice(0, MAX_LONG_TEXT) : null;
    case 'number': {
      if (raw === null || raw === '' || raw === undefined) return null;
      const n = Number(raw);
      if (!Number.isFinite(n)) return null;
      return Math.max(-1e9, Math.min(1e9, n));
    }
    case 'yes_no':
      return raw === true || raw === false ? raw : null;
    case 'single_select':
      return typeof raw === 'string' && q.options.includes(raw) ? raw : null;
    case 'multi_select': {
      if (!Array.isArray(raw)) return [];
      const seen = new Set<string>();
      const out: string[] = [];
      for (const v of raw) {
        if (typeof v !== 'string' || seen.has(v) || !q.options.includes(v)) continue;
        seen.add(v);
        out.push(v);
      }
      return out;
    }
    default:
      return null;
  }
}
