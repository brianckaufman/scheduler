import type { ReactNode } from 'react';

/**
 * The recurring "buttoned" motif: a small tinted square holding a line icon.
 * Background reads from --icon-bg, glyph from --icon-fg — independent of brand,
 * theme-aware, and re-tinted per event via .event-accent. Size variants keep a
 * ≥44px hit target when used as a control (pass `as="button"`).
 */
export function IconChip({
  children,
  size = 'md',
  className = '',
}: {
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const dim = size === 'sm' ? 'w-7 h-7' : size === 'lg' ? 'w-10 h-10' : 'w-9 h-9';
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-chip bg-icon-bg text-icon-fg ${dim} ${className}`}
      aria-hidden="true"
    >
      {children}
    </span>
  );
}
