'use client';

import { parseLocation } from '@/lib/location';

interface LocationDisplayProps {
  location: string;
  className?: string;
  iconClassName?: string;
  textClassName?: string;
}

/** External link icon (opens in new tab indicator) */
const ExternalIcon = ({ size = 3 }: { size?: number }) => (
  <svg
    className={`w-${size} h-${size} inline shrink-0`}
    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
    strokeLinecap="round" strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
    <polyline points="15 3 21 3 21 9" />
    <line x1="10" y1="14" x2="21" y2="3" />
  </svg>
);

/**
 * Renders a location field with smart link behaviour:
 *  - Google Maps address  → opens Google Maps in a new tab, shows map-pin indicator
 *  - Virtual URL (Zoom, Meet, etc.) → opens in new tab, shows external link icon
 *  - Plain text → rendered as text, no link
 */
export default function LocationDisplay({
  location,
  className = '',
  textClassName = 'text-sm text-gray-700',
}: LocationDisplayProps) {
  const parsed = parseLocation(location);

  if (!location?.trim() || (parsed.type === 'text' && !parsed.text)) return null;

  if (parsed.type === 'place') {
    return (
      <a
        href={parsed.url}
        target="_blank"
        rel="noopener noreferrer"
        className={`inline-flex items-center gap-1 underline decoration-dotted underline-offset-2 hover:decoration-solid transition-all ${textClassName} ${className}`}
        title="Open in Google Maps"
      >
        {parsed.label}
        <ExternalIcon size={3} />
      </a>
    );
  }

  if (parsed.type === 'virtual') {
    const displayLabel = parsed.label === parsed.url
      ? (() => {
          try { return new URL(parsed.url).hostname.replace(/^www\./, ''); }
          catch { return parsed.label; }
        })()
      : parsed.label;

    return (
      <a
        href={parsed.url}
        target="_blank"
        rel="noopener noreferrer"
        className={`inline-flex items-center gap-1 underline decoration-dotted underline-offset-2 hover:decoration-solid transition-all ${textClassName} ${className}`}
        title={parsed.url}
      >
        {displayLabel}
        <ExternalIcon size={3} />
      </a>
    );
  }

  // Plain text
  return <span className={`${textClassName} ${className}`}>{parsed.text}</span>;
}
