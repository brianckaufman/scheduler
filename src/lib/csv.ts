// Shared CSV building + download. Previously duplicated inside TimeGrid and
// AllDayGrid; centralised here so the question columns behave identically
// everywhere and every cell is escaped exactly once.

import type { EventQuestion, ResponseValue } from './questions';

/** Quote a cell only when it needs it, doubling any embedded quotes. */
export function csvEscape(v: string): string {
  return v.includes(',') || v.includes('"') || v.includes('\n')
    ? `"${v.replace(/"/g, '""')}"`
    : v;
}

/** Build the whole file. Every cell is escaped here, so callers never hand-escape. */
export function csvJoin(rows: string[][]): string {
  return rows.map((r) => r.map(csvEscape).join(',')).join('\n');
}

export function csvFilename(eventName: string, suffix: string): string {
  const safe = eventName.replace(/[^a-zA-Z0-9 ]/g, '').replace(/\s+/g, '-') || 'event';
  return `${safe}-${suffix}.csv`;
}

export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * One answer as a single cell. Multi-select joins with '; ' rather than ','
 * so the cell doesn't need quoting and stays readable if re-imported.
 */
export function formatAnswerForCsv(v: ResponseValue): string {
  if (v === null || v === undefined || v === '') return '';
  if (Array.isArray(v)) return v.join('; ');
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  return String(v);
}

export interface AnswerRow {
  question_id: string;
  participant_id: string;
  value: ResponseValue;
}

/** Flatten the organizer responses payload into a `participantId|questionId` lookup. */
export function buildAnswerMap(rows: AnswerRow[]): Map<string, ResponseValue> {
  const map = new Map<string, ResponseValue>();
  for (const r of rows) map.set(`${r.participant_id}|${r.question_id}`, r.value);
  return map;
}

/** The trailing question cells for one participant, in question order. */
export function answerCells(
  questions: EventQuestion[],
  map: Map<string, ResponseValue>,
  participantId: string,
): string[] {
  return questions.map((q) => formatAnswerForCsv(map.get(`${participantId}|${q.id}`) ?? null));
}

/** Two questions may share a label — suffix later duplicates so headers stay unique. */
export function dedupeHeaders(labels: string[]): string[] {
  const counts = new Map<string, number>();
  return labels.map((label) => {
    const n = (counts.get(label) ?? 0) + 1;
    counts.set(label, n);
    return n === 1 ? label : `${label} (${n})`;
  });
}
