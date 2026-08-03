'use client';

import ChoiceCard from '@/components/ui/ChoiceCard';
import StepHeader from '@/components/ui/StepHeader';
import type { EventDraft } from '@/hooks/useEventDraft';

const FindTimeIcon = (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="10.5" cy="10.5" r="6.5" />
    <path d="M19.5 19.5L15.5 15.5" />
    <path d="M10.5 8v3l2 1.5" />
  </svg>
);

const RsvpIcon = (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

interface TypeStepProps {
  draft: EventDraft;
  stepNumber: number;
  totalSteps: number;
  /** Called after a type is picked so the wizard can auto-advance. */
  onPicked: () => void;
}

/** Step: pick what you're planning. Tapping a card advances immediately. */
export default function TypeStep({ draft, stepNumber, totalSteps, onPicked }: TypeStepProps) {
  return (
    <div>
      <StepHeader
        stepNumber={stepNumber}
        totalSteps={totalSteps}
        title="What are you planning?"
        subtitle="Pick one — you can always start over."
      />
      <div className="space-y-3">
        <ChoiceCard
          icon={FindTimeIcon}
          title="Find a time"
          description="Not sure when? Everyone marks when they're free, and you pick the best time."
          accent="social"
          selected={draft.eventType === 'availability'}
          onClick={() => { draft.setEventType('availability'); onPicked(); }}
        />
        <ChoiceCard
          icon={RsvpIcon}
          title="Event RSVP"
          description="Date already set? Invite people and collect yes / maybe / no replies."
          accent="teal"
          selected={draft.eventType === 'fixed'}
          onClick={() => { draft.setEventType('fixed'); onPicked(); }}
        />
      </div>
    </div>
  );
}
