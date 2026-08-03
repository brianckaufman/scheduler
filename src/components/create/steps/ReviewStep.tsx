'use client';

import { format } from 'date-fns';
import StepHeader from '@/components/ui/StepHeader';
import Button from '@/components/ui/Button';
import { formatTimeLabel } from '@/lib/timeOptions';
import { stripHtml } from '@/lib/sanitize';
import type { EventDraft } from '@/hooks/useEventDraft';

interface ReviewStepProps {
  draft: EventDraft;
  stepNumber: number;
  totalSteps: number;
  accent: 'social' | 'teal';
  /** Jump straight back to a step to fix something. */
  onEdit: (stepId: 'name' | 'date' | 'time' | 'extras') => void;
}

interface Row {
  label: string;
  value: string;
  step: 'name' | 'date' | 'time' | 'extras';
}

function summarizeDraft(draft: EventDraft): Row[] {
  const rows: Row[] = [
    { label: 'Event', value: draft.name.trim(), step: 'name' },
    { label: 'Hosted by', value: draft.organizerName.trim(), step: 'name' },
  ];

  if (draft.eventType === 'fixed') {
    const start = draft.fixedDate ? format(new Date(draft.fixedDate + 'T12:00'), 'EEEE, MMMM d') : '';
    if (draft.allDay) {
      const end = draft.fixedEndDate && draft.fixedEndDate !== draft.fixedDate
        ? ` – ${format(new Date(draft.fixedEndDate + 'T12:00'), 'EEEE, MMMM d')}`
        : '';
      rows.push({ label: 'When', value: `${start}${end} · all day`, step: 'date' });
    } else {
      rows.push({ label: 'When', value: start, step: 'date' });
      rows.push({
        label: 'Time',
        value: `${formatTimeLabel(draft.fixedTime)} – ${formatTimeLabel(draft.fixedEndTime)}`,
        step: 'time',
      });
    }
  } else {
    const n = draft.selectedDates.length;
    rows.push({ label: 'Possible days', value: `${n} ${n === 1 ? 'day' : 'days'} proposed`, step: 'date' });
    if (!draft.allDay) {
      rows.push({
        label: 'Between',
        value: `${formatTimeLabel(draft.timeStart)} and ${formatTimeLabel(draft.timeEnd)}`,
        step: 'time',
      });
    } else {
      rows.push({ label: 'Comparing', value: 'Whole days (no times)', step: 'date' });
    }
  }

  if (draft.location.trim()) {
    rows.push({ label: 'Where', value: draft.location.trim(), step: 'extras' });
  }
  const details = stripHtml(draft.body).trim();
  if (details) {
    rows.push({ label: 'Details', value: details.length > 80 ? `${details.slice(0, 80)}…` : details, step: 'extras' });
  }
  return rows;
}

/** Step: plain-language summary with per-row Edit, then the big create button (in the shell). */
export default function ReviewStep({ draft, stepNumber, totalSteps, accent, onEdit }: ReviewStepProps) {
  const rows = summarizeDraft(draft);

  return (
    <div>
      <StepHeader
        stepNumber={stepNumber}
        totalSteps={totalSteps}
        accent={accent}
        title="Ready to create?"
        subtitle="Double-check the details — tap Edit to change anything."
      />
      <div className="bg-surface rounded-2xl border border-hairline divide-y divide-hairline-soft">
        {rows.map((row, i) => (
          <div key={`${row.label}-${i}`} className="flex items-center gap-3 px-4 py-3.5">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-faint uppercase tracking-wide">{row.label}</p>
              <p className="text-sm font-medium text-heading mt-0.5 break-words">{row.value}</p>
            </div>
            <Button
              variant="outline"
              accent={accent}
              onClick={() => onEdit(row.step)}
              className="shrink-0 !py-1.5 !px-3 !min-h-0 !text-xs !rounded-xl"
            >
              Edit
            </Button>
          </div>
        ))}
      </div>
      <p className="text-sm text-muted mt-4 leading-relaxed">
        You can add a photo, colors, and more options after creating.
      </p>
      {draft.error && (
        <p className="text-sm text-red-500 font-medium mt-3">{draft.error}</p>
      )}
    </div>
  );
}
