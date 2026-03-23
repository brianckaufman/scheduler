'use client';

import { useState } from 'react';

interface RichTextDisplayProps {
  html: string;
  /** Number of lines to show before "Read more" appears. Default: 4 */
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
 * Shows a "Read more" toggle when the content is longer than clampLines.
 */
export default function RichTextDisplay({
  html,
  clampLines = 4,
  expandLabel = 'Read more',
  collapseLabel = 'Show less',
}: RichTextDisplayProps) {
  const [expanded, setExpanded] = useState(false);

  if (!html || html === '<p></p>') return null;

  return (
    <div className="mt-3">
      <div
        className={`rich-text-display text-sm text-gray-600 leading-relaxed ${
          expanded ? '' : `line-clamp-${clampLines}`
        }`}
        // Content is sanitized via sanitizeHtml() before DB storage
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: html }}
      />
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
    </div>
  );
}
