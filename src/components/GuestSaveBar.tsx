'use client';

import Button from '@/components/ui/Button';

interface GuestSaveBarProps {
  /** 'times' for the time grid, 'days' for the all-day grid — changes the wording. */
  mode: 'times' | 'days';
  savedCount: number;
  addedCount: number;
  removedCount: number;
  isSaving: boolean;
  error: string;
  onSave: () => void;
}

/**
 * Always-visible sticky save bar for availability guests. Replaces the old
 * below-the-grid button that only appeared after the first tap (and could sit
 * off-screen): the guest can now always see what state they're in — nothing
 * selected yet, unsaved changes, or a save error with a retry.
 */
export default function GuestSaveBar({
  mode,
  savedCount,
  addedCount,
  removedCount,
  isSaving,
  error,
  onSave,
}: GuestSaveBarProps) {
  const hasStaged = addedCount > 0 || removedCount > 0;
  const unit = mode === 'times' ? 'time' : 'day';

  // Saved and nothing pending — the done card takes over; no bar needed.
  if (!hasStaged && !error && savedCount > 0) return null;

  const caption = !hasStaged
    ? `Tap every ${unit} you're free — then save here`
    : addedCount > 0 && removedCount > 0
      ? `${addedCount} added, ${removedCount} removed — not saved yet`
      : addedCount > 0
        ? `${addedCount} ${unit}${addedCount === 1 ? '' : 's'} selected — not saved yet`
        : `${removedCount} ${unit}${removedCount === 1 ? '' : 's'} removed — not saved yet`;

  return (
    <div className="sticky bottom-0 z-30 -mx-4 mt-4 bg-surface/95 backdrop-blur border-t border-hairline-soft px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      {error ? (
        <>
          <p className="text-sm text-red-500 font-medium mb-2">{error}</p>
          <Button variant="primary" accent="social" size="lg" fullWidth loading={isSaving} onClick={onSave}>
            Try saving again
          </Button>
        </>
      ) : (
        <>
          <Button
            variant="primary"
            accent="social"
            size="lg"
            fullWidth
            disabled={!hasStaged}
            loading={isSaving}
            onClick={onSave}
          >
            {hasStaged ? (
              <>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Save my availability
              </>
            ) : (
              `Tap the ${unit}s you're free below`
            )}
          </Button>
          <p className={`text-xs text-center mt-1.5 ${hasStaged ? 'text-amber-600 dark:text-amber-400 font-medium' : 'text-faint'}`}>
            {caption}
          </p>
        </>
      )}
    </div>
  );
}
