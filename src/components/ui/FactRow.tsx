import type { ReactNode } from 'react';
import { IconChip } from './IconChip';

/**
 * Generic, data-driven fact row: icon chip + optional overline label + value.
 * Used for date, time, location, organizer, capacity, price, dress code, etc.
 * `href` makes the whole row a link (e.g. location → directions).
 */
export function FactRow({
  icon,
  label,
  value,
  trailing,
  href,
}: {
  icon: ReactNode;
  label?: ReactNode;
  value: ReactNode;
  trailing?: ReactNode;
  href?: string;
}) {
  const inner = (
    <>
      <IconChip>{icon}</IconChip>
      <div className="min-w-0 flex-1">
        {label && (
          <div className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-faint leading-none mb-1">
            {label}
          </div>
        )}
        <div className="text-sm text-body leading-snug [text-wrap:pretty]">{value}</div>
      </div>
      {trailing && <div className="shrink-0">{trailing}</div>}
    </>
  );

  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-3 rounded-field -mx-1 px-1 py-1 hover:bg-subtle transition-colors"
      >
        {inner}
      </a>
    );
  }
  return <div className="flex items-center gap-3">{inner}</div>;
}
