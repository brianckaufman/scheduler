'use client';

import StepHeader from '@/components/ui/StepHeader';
import type { EventDraft } from '@/hooks/useEventDraft';

interface NameStepProps {
  draft: EventDraft;
  stepNumber: number;
  totalSteps: number;
  accent: 'social' | 'teal';
}

const inputClass =
  'w-full px-4 py-3.5 rounded-xl border-2 border-hairline bg-surface focus:outline-none focus:ring-2 focus:ring-social-400 focus:border-transparent text-base text-heading placeholder-faint transition-shadow duration-200';

/** Step: the two identity fields, nothing else. */
export default function NameStep({ draft, stepNumber, totalSteps, accent }: NameStepProps) {
  return (
    <div>
      <StepHeader
        stepNumber={stepNumber}
        totalSteps={totalSteps}
        accent={accent}
        title="What's the occasion?"
        subtitle="Give your event a name people will recognize."
      />
      <div className="space-y-5">
        <div>
          <label htmlFor="wizard-event-name" className="block text-sm font-semibold text-body mb-2">
            Event name
          </label>
          <input
            id="wizard-event-name"
            type="text"
            value={draft.name}
            onChange={(e) => draft.setName(e.target.value)}
            placeholder="Taco Night, Book Club, Family Reunion…"
            className={inputClass}
            maxLength={100}
            autoFocus
          />
        </div>
        <div>
          <label htmlFor="wizard-organizer-name" className="block text-sm font-semibold text-body mb-2">
            And your name?
          </label>
          <input
            id="wizard-organizer-name"
            type="text"
            value={draft.organizerName}
            onChange={(e) => draft.setOrganizerName(e.target.value)}
            placeholder="So guests know who's asking"
            className={inputClass}
            maxLength={50}
          />
        </div>
      </div>
    </div>
  );
}
