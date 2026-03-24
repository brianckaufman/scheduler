'use client';

import { useState } from 'react';

interface RichTextDisplayProps {
  html: string;
  /** Plain-text character threshold before "Read more" appears. Default: 280 */
  truncateAt?: number;
  /** Label for the expand button. Default: "Read more" */
  expandLabel?: string;
  /** Label for the collapse button. Default: "Show less" */
  collapseLabel?: string;
}

/** Strip HTML tags to measure plain-text length. */
function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

/**
 * Renders organizer-authored rich-text HTML safely.
 * Content is sanitized server-side before storage; this component only
 * renders what's already in the database.
 *
 * Shows a "Read more" toggle only when plain-text length exceeds truncateAt.
 * Short descriptions never show the button.
 */
export default function RichTextDisplay({
  html,
  truncateAt = 280,
  expandLabel = 'Read more',
  collapseLabel = 'Show less',
}: RichTextDisplayProps) {
  const [expanded, setExpanded] = useState(false);

  if (!html || html === '<p></p>') return null;

  const isLong = stripHtml(html).length > truncateAt;

  return (
    <div className="mt-3">
      <div
        className={`rich-text-display text-sm text-gray-600 leading-relaxed${
          isLong && !expanded ? ' line-clamp-5' : ''
        }`}
        // Content is sanitized via sanitizeHtml() before DB storage
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: html }}
      />
      {isLong && (
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
