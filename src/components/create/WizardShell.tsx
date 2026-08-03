'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import Button from '@/components/ui/Button';

type Accent = 'social' | 'teal' | 'neutral';

interface WizardShellProps {
  /** 0-based index of the current step (for dots). */
  step: number;
  total: number;
  accent: Accent;
  direction: 'next' | 'prev';
  onBack?: () => void;
  primaryLabel: string;
  onPrimary: () => void;
  primaryDisabled?: boolean;
  primaryLoading?: boolean;
  /** Optional second footer button (e.g. "Skip this"). */
  secondaryLabel?: string;
  onSecondary?: () => void;
  /** Steps that auto-advance (type choice, success) hide the nav bar. */
  hideNav?: boolean;
  children: ReactNode;
}

const DOT_ACTIVE: Record<Accent, string> = {
  social: 'bg-social-500',
  teal: 'bg-teal-500',
  neutral: 'bg-heading',
};

/**
 * Full-screen wizard chrome: minimal header, progress dots, one step's
 * content, and a sticky bottom nav that is always thumb-reachable. The step
 * content slides in the direction of travel (same animation pair as the
 * first-visit onboarding overlay).
 */
export default function WizardShell({
  step,
  total,
  accent,
  direction,
  onBack,
  primaryLabel,
  onPrimary,
  primaryDisabled,
  primaryLoading,
  secondaryLabel,
  onSecondary,
  hideNav = false,
  children,
}: WizardShellProps) {
  return (
    <div className="min-h-dvh bg-subtle flex flex-col">
      {/* Header: home escape hatch + progress dots */}
      <div className="max-w-md w-full mx-auto px-4 pt-5 flex items-center justify-between">
        <Link
          href="/"
          className="text-sm font-medium text-faint hover:text-secondary transition-colors px-2 py-1 -ml-2 rounded-lg"
        >
          ← Home
        </Link>
        <div className="flex items-center gap-1.5" aria-label={`Step ${step + 1} of ${total}`}>
          {Array.from({ length: total }).map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === step
                  ? `w-6 ${DOT_ACTIVE[accent]}`
                  : i < step
                    ? `w-1.5 ${DOT_ACTIVE[accent]} opacity-40`
                    : 'w-1.5 bg-fill2'
              }`}
            />
          ))}
        </div>
        {/* Spacer balancing the Home link so dots stay centered */}
        <span className="w-14" aria-hidden="true" />
      </div>

      {/* Step content — keyed by step upstream so the slide re-triggers */}
      <div className="flex-1 w-full max-w-md mx-auto px-4 pt-6 pb-8">
        <div className={direction === 'next' ? 'onboarding-slide-in-right' : 'onboarding-slide-in-left'}>
          {children}
        </div>
      </div>

      {/* Sticky bottom nav — never below the fold */}
      {!hideNav && (
        <div className="sticky bottom-0 bg-subtle/95 backdrop-blur border-t border-hairline-soft">
          <div className="max-w-md mx-auto px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] flex gap-3">
            {onBack && (
              <Button variant="secondary" size="lg" onClick={onBack} className="shrink-0 px-6">
                Back
              </Button>
            )}
            {secondaryLabel && onSecondary && (
              <Button variant="secondary" size="lg" fullWidth onClick={onSecondary}>
                {secondaryLabel}
              </Button>
            )}
            <Button
              variant="primary"
              accent={accent}
              size="lg"
              fullWidth
              onClick={onPrimary}
              disabled={primaryDisabled}
              loading={primaryLoading}
            >
              {primaryLabel}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
