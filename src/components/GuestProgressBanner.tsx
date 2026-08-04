'use client';

interface GuestProgressBannerProps {
  /** 'fixed' (RSVP) or 'availability'. */
  eventType: string;
  /** True once the guest has a saved response (RSVP answered / times saved). */
  responded: boolean;
  /** True while there are unsaved staged changes (availability only). */
  pending: boolean;
}

/**
 * Sticky one-line guide for guests: always tells them where they are and what
 * to do next. Step 1 (your name) happens on the entry screen, so this banner
 * only ever shows step 2 or the done state.
 */
export default function GuestProgressBanner({ eventType, responded, pending, }: GuestProgressBannerProps) {
  const isFixed = eventType === 'fixed';

  const done = responded && !pending;
  const label = done
    ? "You're done — your reply is saved"
    : pending
      ? 'Almost there — tap Save below to finish'
      : isFixed
        ? 'Step 2 of 2 — Tap your answer below'
        : "Step 2 of 2 — Tap the times you're free, then Save";

  return (
    <div
      className={`sticky top-0 z-40 -mx-4 px-20 py-2.5 text-center text-sm font-semibold backdrop-blur border-b transition-colors ${
        done
          ? 'bg-green-50/95 dark:bg-[#112D25]/95 text-green-800 dark:text-green-300 border-green-200 dark:border-[#123428]'
          : pending
            ? 'bg-amber-50/95 dark:bg-[#302817]/95 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-[#4A3A1A]'
            : 'bg-surface/95 text-body border-hairline-soft'
      }`}
      role="status"
    >
      <span className="inline-flex items-center gap-1.5">
        {done && (
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
        {label}
      </span>
    </div>
  );
}
