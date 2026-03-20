'use client';

import { useState, useEffect } from 'react';
import { useBranding } from '@/contexts/BrandingContext';

interface SupportBannerProps {
  /** URL to Buy Me a Coffee (or similar) */
  url: string;
  /** Button text, e.g. "Buy me a coffee ☕" */
  cta: string;
  /** Message above the button */
  message?: string;
  /** Visual variant */
  variant?: 'inline' | 'banner' | 'compact';
  /** sessionStorage key — if set, banner shows only once per session */
  sessionKey?: string;
}

/**
 * Reusable donation/support prompt.
 *
 * - `inline` (default): Subtle single-line link in footers
 * - `banner`: Prominent card with message + button (for "all set" moments)
 * - `compact`: Small pill button for tighter spaces
 */
export default function SupportBanner({
  url,
  cta,
  message,
  variant = 'inline',
  sessionKey,
}: SupportBannerProps) {
  const branding = useBranding();
  const [visible, setVisible] = useState(!sessionKey);

  useEffect(() => {
    if (!sessionKey) return;
    if (sessionStorage.getItem(sessionKey)) {
      setVisible(false);
    } else {
      sessionStorage.setItem(sessionKey, '1');
      setVisible(true);
    }
  }, [sessionKey]);

  if (!url || !visible) return null;

  // ── Compact pill ──────────────────────────────────────────────
  if (variant === 'compact') {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-full transition-colors"
      >
        <HeartIcon className="w-3.5 h-3.5" />
        {cta}
      </a>
    );
  }

  // ── Prominent banner (post-action gratitude moment) ───────────
  if (variant === 'banner') {
    return (
      <div className="animate-fade-in mt-4 rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50 to-orange-50 p-5 text-center">
        {message && (
          <p className="text-sm text-amber-800 font-medium mb-2">{message}</p>
        )}
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-full shadow-sm hover:shadow transition-all duration-200 active:scale-95"
        >
          <HeartIcon className="w-4 h-4" />
          {cta}
        </a>
        {branding.site_name && (
          <p className="text-xs text-amber-400 mt-2">
            Helps keep {branding.site_name} free for everyone
          </p>
        )}
      </div>
    );
  }

  // ── Inline footer link (default) ─────────────────────────────
  return (
    <div className="text-center py-2">
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-teal-600 transition-colors group"
      >
        <HeartIcon className="w-3.5 h-3.5 text-gray-300 group-hover:text-red-400 transition-colors" />
        <span>{cta}</span>
      </a>
    </div>
  );
}

function HeartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
    </svg>
  );
}
