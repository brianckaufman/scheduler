'use client';

import { Suspense, lazy } from 'react';
import StepHeader from '@/components/ui/StepHeader';
import LocationInput from '@/components/LocationInput';
import type { EventDraft } from '@/hooks/useEventDraft';

const RichTextEditor = lazy(() => import('@/components/RichTextEditor'));

interface ExtrasStepProps {
  draft: EventDraft;
  stepNumber: number;
  totalSteps: number;
  accent: 'social' | 'teal';
}

const inputClass =
  'w-full px-4 py-3.5 rounded-xl border-2 border-hairline bg-surface focus:outline-none focus:ring-2 focus:ring-social-400 focus:border-transparent text-base text-heading placeholder-faint transition-shadow duration-200';

/** Step: optional niceties. Both fields skippable — "Skip this" is a real button in the shell. */
export default function ExtrasStep({ draft, stepNumber, totalSteps, accent }: ExtrasStepProps) {
  return (
    <div>
      <StepHeader
        stepNumber={stepNumber}
        totalSteps={totalSteps}
        accent={accent}
        title="Anything else?"
        subtitle="Totally optional — you can also add these later."
      />
      <div className="space-y-5">
        <div>
          <label className="block text-sm font-semibold text-body mb-2">
            Where is it? <span className="text-faint font-normal">(optional)</span>
          </label>
          <LocationInput value={draft.location} onChange={draft.setLocation} inputClassName={inputClass} />
        </div>
        <div>
          <label className="block text-sm font-semibold text-body mb-2">
            Details for your guests <span className="text-faint font-normal">(optional)</span>
          </label>
          <Suspense fallback={<div className="h-28 rounded-xl border-2 border-hairline bg-subtle animate-pulse" />}>
            <RichTextEditor
              value={draft.body}
              onChange={draft.setBody}
              placeholder="What to bring, parking tips, the plan for the day…"
              minHeight={100}
            />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
