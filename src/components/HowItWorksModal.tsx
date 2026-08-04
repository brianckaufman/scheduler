'use client';

import { useCopy, interpolate } from '@/contexts/CopyContext';
import { firstName } from '@/lib/names';
import Button from '@/components/ui/Button';
import type { Event } from '@/types';

interface HowItWorksModalProps {
  event: Event;
  onClose: () => void;
}

/**
 * The "how does this work?" explainer, openable at any time from the event
 * page — instructions used to live on a one-time interstitial guests could
 * never get back to.
 */
export default function HowItWorksModal({ event, onClose }: HowItWorksModalProps) {
  const copy = useCopy();
  const isFixed = event.event_type === 'fixed';
  const accent = isFixed ? 'teal' : 'social';
  const accentNum = isFixed
    ? 'bg-teal-50 dark:bg-[#0D223A] text-accent-fg'
    : 'bg-social-50 dark:bg-[#1C1939] text-social-fg';

  const steps = isFixed
    ? [
        { title: copy.onboarding.rsvp_step1_title, desc: copy.onboarding.rsvp_step1_desc },
        { title: copy.onboarding.rsvp_step2_title, desc: copy.onboarding.rsvp_step2_desc },
        { title: copy.onboarding.rsvp_step3_title, desc: copy.onboarding.rsvp_step3_desc },
      ]
    : [
        { title: copy.onboarding.step1_title, desc: copy.onboarding.step1_desc },
        { title: copy.onboarding.step2_title, desc: copy.onboarding.step2_desc },
        {
          title: interpolate(copy.onboarding.step3_title, { organizer: firstName(event.organizer_name || 'The organizer') }),
          desc: copy.onboarding.step3_desc,
        },
      ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 animate-fade-in"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-surface w-full max-w-sm rounded-t-2xl sm:rounded-2xl shadow-xl animate-slide-up p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <h2 className="text-xl font-bold text-heading mb-5">How this works</h2>
        <div className="space-y-4 mb-6">
          {steps.map((s, i) => (
            <div key={i} className="flex items-start gap-3.5">
              <div className={`shrink-0 w-7 h-7 rounded-full ${accentNum} flex items-center justify-center text-xs font-bold mt-0.5`}>
                {i + 1}
              </div>
              <div>
                <p className="text-sm font-semibold text-heading">{s.title}</p>
                <p className="text-sm text-muted mt-0.5 leading-relaxed">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
        <Button variant="primary" accent={accent} size="lg" fullWidth onClick={onClose}>
          Got it
        </Button>
      </div>
    </div>
  );
}
