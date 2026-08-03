'use client';

import StepHeader from '@/components/ui/StepHeader';
import { TIME_OPTIONS, formatTimeLabel, enumDurationEndTimeOptions } from '@/lib/timeOptions';
import type { EventDraft } from '@/hooks/useEventDraft';

interface TimeStepProps {
  draft: EventDraft;
  stepNumber: number;
  totalSteps: number;
  accent: 'social' | 'teal';
}

const selectClass =
  'w-full px-4 py-3.5 rounded-xl border-2 border-hairline bg-surface focus:outline-none focus:ring-2 focus:ring-social-400 text-base text-heading transition-shadow duration-200 cursor-pointer';

/**
 * Step: times. Skipped entirely for all-day events. Defaults are pre-picked
 * so "just tap Next" is always a valid path.
 */
export default function TimeStep({ draft, stepNumber, totalSteps, accent }: TimeStepProps) {
  const isFixed = draft.eventType === 'fixed';

  if (isFixed) {
    const endOptions = enumDurationEndTimeOptions(draft.fixedTime);
    return (
      <div>
        <StepHeader
          stepNumber={stepNumber}
          totalSteps={totalSteps}
          accent={accent}
          title="What time?"
          subtitle="Just tap Next if this looks right."
        />
        <div className="space-y-5">
          <div>
            <label htmlFor="wizard-start-time" className="block text-sm font-semibold text-body mb-2">
              Starts at
            </label>
            <select
              id="wizard-start-time"
              value={draft.fixedTime}
              onChange={(e) => {
                const v = e.target.value;
                draft.setFixedTime(v);
                const opts = enumDurationEndTimeOptions(v);
                if (!opts.some((o) => o.value === draft.fixedEndTime)) {
                  draft.setFixedEndTime(opts.find((o) => o.minutes === 60)?.value ?? opts[0]?.value ?? v);
                }
              }}
              className={selectClass}
            >
              {TIME_OPTIONS.map((t) => (
                <option key={t} value={t}>{formatTimeLabel(t)}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="wizard-end-time" className="block text-sm font-semibold text-body mb-2">
              Ends at
            </label>
            <select
              id="wizard-end-time"
              value={draft.fixedEndTime}
              onChange={(e) => draft.setFixedEndTime(e.target.value)}
              className={selectClass}
            >
              {endOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <StepHeader
        stepNumber={stepNumber}
        totalSteps={totalSteps}
        accent={accent}
        title="Between what hours?"
        subtitle="Guests will only be asked about times inside this window. Just tap Next if this looks right."
      />
      <div className="space-y-5">
        <div>
          <label htmlFor="wizard-time-start" className="block text-sm font-semibold text-body mb-2">
            No earlier than
          </label>
          <select
            id="wizard-time-start"
            value={draft.timeStart}
            onChange={(e) => draft.setTimeStart(e.target.value)}
            className={selectClass}
          >
            {TIME_OPTIONS.map((t) => (
              <option key={t} value={t}>{formatTimeLabel(t)}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="wizard-time-end" className="block text-sm font-semibold text-body mb-2">
            No later than
          </label>
          <select
            id="wizard-time-end"
            value={draft.timeEnd}
            onChange={(e) => draft.setTimeEnd(e.target.value)}
            className={selectClass}
          >
            {TIME_OPTIONS.map((t) => (
              <option key={t} value={t}>{formatTimeLabel(t)}</option>
            ))}
          </select>
        </div>
        {draft.timeStart >= draft.timeEnd && (
          <p className="text-sm text-red-500 font-medium">
            The end of the window has to be after the start.
          </p>
        )}
      </div>
    </div>
  );
}
