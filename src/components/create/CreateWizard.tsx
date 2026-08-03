'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import WizardShell from './WizardShell';
import TypeStep from './steps/TypeStep';
import NameStep from './steps/NameStep';
import DateStep from './steps/DateStep';
import TimeStep from './steps/TimeStep';
import ExtrasStep from './steps/ExtrasStep';
import ReviewStep from './steps/ReviewStep';
import SuccessStep from './steps/SuccessStep';
import { useEventDraft } from '@/hooks/useEventDraft';

type StepId = 'type' | 'name' | 'date' | 'time' | 'extras' | 'review';

interface CreateWizardProps {
  enableFixedEvents: boolean;
}

/**
 * The step-by-step creation flow. One question per screen; the step index
 * lives in ?step= so the browser's Back button walks backward naturally.
 */
export default function CreateWizard({ enableFixedEvents }: CreateWizardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const draft = useEventDraft();
  const [direction, setDirection] = useState<'next' | 'prev'>('next');
  const [createdSlug, setCreatedSlug] = useState<string | null>(null);
  const prevStepRef = useRef(0);

  // Apply a preset type from the homepage launcher (?type=availability|fixed).
  const presetType = searchParams.get('type');
  useEffect(() => {
    if (draft.eventType !== null) return;
    if (presetType === 'availability' || presetType === 'fixed') {
      draft.setEventType(presetType);
    } else if (!enableFixedEvents) {
      draft.setEventType('availability');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presetType, enableFixedEvents]);

  // Live step list: type step only when there's a real choice to make;
  // time step disappears in all-day mode.
  const steps = useMemo<StepId[]>(() => {
    const list: StepId[] = [];
    if (enableFixedEvents && !presetType) list.push('type');
    list.push('name', 'date');
    if (!draft.allDay) list.push('time');
    list.push('extras', 'review');
    return list;
  }, [enableFixedEvents, presetType, draft.allDay]);

  // The URL is the source of truth for position; clamp anything invalid.
  const rawStep = parseInt(searchParams.get('step') ?? '0', 10);
  const firstInvalid = steps.findIndex((id) => !draft.stepValid[id]);
  const maxReachable = firstInvalid === -1 ? steps.length - 1 : firstInvalid;
  const stepIndex = Math.min(Math.max(isNaN(rawStep) ? 0 : rawStep, 0), Math.min(maxReachable, steps.length - 1));
  const stepId = steps[stepIndex];

  useEffect(() => {
    setDirection(stepIndex >= prevStepRef.current ? 'next' : 'prev');
    prevStepRef.current = stepIndex;
  }, [stepIndex]);

  const goTo = (index: number) => {
    setDirection(index >= stepIndex ? 'next' : 'prev');
    router.push(`/new?step=${index}${presetType ? `&type=${presetType}` : ''}`, { scroll: true });
  };
  const goToId = (id: StepId) => {
    const idx = steps.indexOf(id);
    if (idx !== -1) goTo(idx);
  };
  const goNext = () => { if (stepIndex < steps.length - 1) goTo(stepIndex + 1); };
  const goBack = () => { if (stepIndex > 0) goTo(stepIndex - 1); };

  const handleCreate = async () => {
    try {
      const { slug } = await draft.submit();
      setCreatedSlug(slug);
      // Replace history so Back from the success screen can't re-enter review
      // with a submitted draft.
      router.replace(`/new?step=done`);
      window.scrollTo(0, 0);
    } catch { /* error already surfaced via draft.error */ }
  };

  if (createdSlug && draft.eventType) {
    return (
      <div className="min-h-dvh bg-subtle">
        <div className="max-w-md mx-auto px-4 py-10">
          <SuccessStep
            slug={createdSlug}
            eventName={draft.name}
            eventType={draft.eventType}
            accent={draft.eventType === 'fixed' ? 'teal' : 'social'}
            onGoToEvent={() => router.push(`/e/${createdSlug}`)}
          />
        </div>
      </div>
    );
  }

  const accent: 'social' | 'teal' | 'neutral' =
    draft.eventType === 'fixed' ? 'teal' : draft.eventType === 'availability' ? 'social' : 'neutral';
  const stepAccent: 'social' | 'teal' = accent === 'neutral' ? 'social' : accent;
  const stepNumber = stepIndex + 1;
  const totalSteps = steps.length;
  const isReview = stepId === 'review';

  return (
    <WizardShell
      step={stepIndex}
      total={totalSteps}
      accent={accent}
      direction={direction}
      onBack={stepIndex > 0 ? goBack : undefined}
      primaryLabel={isReview ? 'Create my event' : 'Next'}
      onPrimary={isReview ? handleCreate : goNext}
      primaryDisabled={!draft.stepValid[stepId]}
      primaryLoading={isReview && draft.loading}
      secondaryLabel={stepId === 'extras' ? 'Skip this' : undefined}
      onSecondary={stepId === 'extras' ? goNext : undefined}
      hideNav={stepId === 'type'}
    >
      <div key={stepId}>
        {stepId === 'type' && (
          <TypeStep draft={draft} stepNumber={stepNumber} totalSteps={totalSteps} onPicked={goNext} />
        )}
        {stepId === 'name' && (
          <NameStep draft={draft} stepNumber={stepNumber} totalSteps={totalSteps} accent={stepAccent} />
        )}
        {stepId === 'date' && (
          <DateStep draft={draft} stepNumber={stepNumber} totalSteps={totalSteps} accent={stepAccent} />
        )}
        {stepId === 'time' && (
          <TimeStep draft={draft} stepNumber={stepNumber} totalSteps={totalSteps} accent={stepAccent} />
        )}
        {stepId === 'extras' && (
          <ExtrasStep draft={draft} stepNumber={stepNumber} totalSteps={totalSteps} accent={stepAccent} />
        )}
        {stepId === 'review' && (
          <ReviewStep draft={draft} stepNumber={stepNumber} totalSteps={totalSteps} accent={stepAccent} onEdit={goToId} />
        )}
      </div>
    </WizardShell>
  );
}
