'use client';

import { useState, useEffect } from 'react';
import { useCopy } from '@/contexts/CopyContext';

interface BookmarkPromptProps {
  eventSlug: string;
}

/**
 * Smart bookmark/save prompt for organizers.
 * Detects platform and shows the right instructions:
 * - macOS: Cmd+D
 * - Windows/Linux: Ctrl+D
 * - Mobile: "Add to Home Screen" via share sheet
 *
 * Dismissable and remembers the dismissal in localStorage.
 * Appears with a delay to not overwhelm on first load.
 */
export default function BookmarkPrompt({ eventSlug }: BookmarkPromptProps) {
  const copy = useCopy();
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(true); // default hidden until checked

  const storageKey = `bookmark_dismissed_${eventSlug}`;

  useEffect(() => {
    const wasDismissed = localStorage.getItem(storageKey) === 'true';
    if (wasDismissed) {
      setDismissed(true);
      return;
    }
    setDismissed(false);
    // Show after a brief delay so it doesn't compete with other content
    const timer = setTimeout(() => setVisible(true), 2500);
    return () => clearTimeout(timer);
  }, [storageKey]);

  const handleDismiss = () => {
    setVisible(false);
    setDismissed(true);
    localStorage.setItem(storageKey, 'true');
  };

  if (dismissed || !visible) return null;

  // Platform detection
  const isMobile =
    typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0;
  const isMac =
    typeof navigator !== 'undefined' &&
    /Mac|iPhone|iPad|iPod/.test(navigator.userAgent);

  const celebrationCopy = copy.celebration;
  const title = celebrationCopy?.bookmark_title || 'Bookmark this page';
  const desc =
    celebrationCopy?.bookmark_desc ||
    "You'll want to come back to check responses and pick the final time.";
  const dismissLabel = celebrationCopy?.bookmark_dismiss || 'Got it';

  let shortcutText: string;
  if (isMobile) {
    shortcutText = celebrationCopy?.bookmark_mobile || 'Tap Share, then "Add to Home Screen"';
  } else if (isMac) {
    shortcutText = celebrationCopy?.bookmark_shortcut_mac || 'Press Cmd+D to bookmark';
  } else {
    shortcutText = celebrationCopy?.bookmark_shortcut_win || 'Press Ctrl+D to bookmark';
  }

  return (
    <div className="animate-fade-in mb-4 bg-indigo-50 border border-indigo-100 rounded-2xl p-4">
      <div className="flex items-start gap-3">
        <div className="shrink-0 mt-0.5">
          <svg
            className="w-5 h-5 text-indigo-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
            />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-indigo-900">{title}</p>
          <p className="text-xs text-indigo-600 mt-0.5">{desc}</p>
          <div className="flex items-center gap-3 mt-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-700 bg-indigo-100 px-2.5 py-1 rounded-full">
              {isMobile ? (
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
              ) : (
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
              )}
              {shortcutText}
            </span>
            <button
              type="button"
              onClick={handleDismiss}
              className="text-xs text-indigo-500 hover:text-indigo-700 transition-colors cursor-pointer"
            >
              {dismissLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
