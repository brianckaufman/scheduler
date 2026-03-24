'use client';

import { useState, useRef, useEffect } from 'react';

interface RichTextDisplayProps {
  html: string;
  /** Number of lines to clamp before "Read more" appears. Default: 3 */
  clampLines?: number;
  /** Label for the expand button. Default: "Read more" */
  expandLabel?: string;
  /** Label for the collapse button. Default: "Show less" */
  collapseLabel?: string;
}

/**
 * Renders organizer-authored rich-text HTML safely.
 * Content is sanitized server-side before storage; this component only
 * renders what's already in the database.
 *
 * Shows a "Read more" toggle only when the content actually overflows
 * the clamped height — short content never shows the button.
 */
export default function RichTextDisplay({
  html,
  clampLines = 3,
  expandLabel = 'Read more',
  collapseLabel = 'Show less',
}: RichTextDisplayProps) {
  const [expanded, setExpanded] = useState(false);
  const [showToggle, setShowToggle] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  // Measure overflow while clamped to decide whether to show the button.
  // Runs after paint so the clamped CSS is applied before we measure.
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    // When not expanded, clamp is active — scrollHeight > clientHeight means overflow.
    // Add 1px tolerance for sub-pixel rounding.
    setShowToggle(el.scrollHeight > el.clientHeight + 1);
  }, [html]); // re-check if html content changes; intentionally excludes `expanded`

  if (!html || html === '<p></p>') return null;

  return (
    <div className="mt-3">
      <div
        ref={contentRef}
        className={`rich-text-display text-sm text-gray-600 leading-relaxed overflow-hidden ${
          expanded ? '' : `line-clamp-${clampLines}`
        }`}
        // Content is sanitized via sanitizeHtml() before DB storage
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: html }}
      />
      {showToggle && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-1.5 text-xs font-medium text-gray-400 hover:text-gray-600 transition-colors cursor-pointer flex items-center gap-1"
        >
          {expanded ? (
            <>
              {collapseLabel}
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 15l-6-6-6 6" />
              </svg>
            </>
          ) : (
            <>
              {expandLabel}
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </>
          )}
        </button>
      )}
    </div>
  );
}
