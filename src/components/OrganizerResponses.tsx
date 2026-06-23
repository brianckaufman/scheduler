'use client';

import { useEffect, useState } from 'react';
import { formatDisplayName } from '@/lib/names';
import type { EventQuestion, ResponseValue } from '@/lib/questions';

function fmt(v: ResponseValue): string {
  if (v == null || v === '') return '—';
  if (Array.isArray(v)) return v.join(', ');
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  return String(v);
}

type Row = { question_id: string; participant_name: string; value: ResponseValue };

/** Organizer-only: collapsible view of guests' answers, grouped by question. */
export default function OrganizerResponses({
  eventId,
  organizerToken,
  questions,
}: {
  eventId: string;
  organizerToken: string;
  questions: EventQuestion[];
}) {
  const [rows, setRows] = useState<Row[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    fetch(`/api/events/${eventId}/responses?organizer_token=${encodeURIComponent(organizerToken)}`)
      .then((r) => r.json())
      .then((d) => setRows(d.responses ?? []))
      .catch(() => {});
  }, [open, eventId, organizerToken]);

  if (questions.length === 0) return null;

  return (
    <div className="border-t border-hairline-soft pt-1">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between py-2.5 text-left rounded-lg hover:bg-subtle transition-colors cursor-pointer"
      >
        <span className="text-sm font-semibold text-body">Question responses</span>
        <svg className={`w-4 h-4 text-faint transition-transform duration-200 ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="pb-2 space-y-3 animate-fade-in">
          {questions.map((q) => {
            const ans = rows.filter((r) => r.question_id === q.id && fmt(r.value) !== '—');
            return (
              <div key={q.id}>
                <p className="text-xs font-semibold text-body">{q.label}</p>
                {ans.length === 0 ? (
                  <p className="text-xs text-faint mt-0.5">No answers yet</p>
                ) : (
                  <ul className="mt-1 space-y-0.5">
                    {ans.map((r, i) => (
                      <li key={i} className="text-xs text-secondary">
                        <b className="text-body">{formatDisplayName(r.participant_name)}:</b> {fmt(r.value)}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
