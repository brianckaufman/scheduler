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

/** Has the guest provided an acceptable answer for a required question? */
export function isAnswered(q: EventQuestion, value: ResponseValue): boolean {
  if (q.type === 'multi_select') return Array.isArray(value) && value.length > 0;
  if (q.type === 'yes_no') return value === true || value === false;
  if (q.type === 'number') return value !== null && value !== '' && !Number.isNaN(Number(value));
  return typeof value === 'string' ? value.trim().length > 0 : value != null;
}

/** Server-side: coerce/clean an incoming question definition. Returns null if invalid. */
export function sanitizeQuestion(input: unknown, position: number): Omit<EventQuestion, 'id'> | null {
  if (!input || typeof input !== 'object') return null;
  const o = input as Record<string, unknown>;
  if (!isQuestionType(o.type)) return null;
  const label = typeof o.label === 'string' ? o.label.trim().slice(0, 200) : '';
  if (!label) return null;
  let options: string[] = [];
  if (needsOptions(o.type) && Array.isArray(o.options)) {
    options = o.options
      .filter((x): x is string => typeof x === 'string')
      .map((x) => x.trim())
      .filter(Boolean)
      .slice(0, 20);
  }
  if (needsOptions(o.type) && options.length < 1) return null;
  return { type: o.type, label, options, required: o.required === true, position };
}
