'use client';

import type { ReactNode } from 'react';
import { CheckIcon } from './icons';

type Accent = 'social' | 'teal';

interface ChoiceCardProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  accent: Accent;
  /** Selected state is loud and persistent: thick colored border + tint + check badge. */
  selected?: boolean;
  /** Compact = horizontal pill row (e.g. "Specific times" / "All day"). */
  compact?: boolean;
  onClick: () => void;
}

const ACCENTS: Record<Accent, { border: string; tint: string; chip: string; badge: string }> = {
  social: {
    border: 'border-social-500',
    tint: 'bg-social-50 dark:bg-social-500/10',
    chip: 'bg-social-100 dark:bg-social-500/20 text-social-600',
    badge: 'bg-social-500',
  },
  teal: {
    border: 'border-teal-500',
    tint: 'bg-teal-50 dark:bg-teal-500/10',
    chip: 'bg-teal-100 dark:bg-teal-500/20 text-teal-600',
    badge: 'bg-teal-500',
  },
};

/**
 * A big, unmistakably tappable option card. The whole surface is the button;
 * selection is shown with a thick accent border, tinted fill, and a filled
 * check badge — visible at a glance, not hover-dependent.
 */
export default function ChoiceCard({
  icon,
  title,
  description,
  accent,
  selected = false,
  compact = false,
  onClick,
}: ChoiceCardProps) {
  const a = ACCENTS[accent];

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`relative w-full text-left rounded-2xl border-2 transition-all duration-200 active:scale-[0.98] cursor-pointer ${
        compact ? 'px-4 py-3 min-h-[52px]' : 'p-5 min-h-[72px]'
      } ${
        selected
          ? `${a.border} ${a.tint} shadow-sm`
          : 'border-hairline bg-surface hover:border-strong hover:shadow-sm'
      }`}
    >
      {selected && (
        <span
          className={`absolute top-3 right-3 w-6 h-6 rounded-full ${a.badge} text-white flex items-center justify-center animate-fade-in-scale`}
          aria-hidden="true"
        >
          <CheckIcon className="w-3.5 h-3.5" />
        </span>
      )}
      <span className={`flex items-center gap-3 ${selected ? 'pr-8' : ''}`}>
        {icon && (
          <span className={`shrink-0 w-11 h-11 rounded-xl flex items-center justify-center ${a.chip}`}>
            {icon}
          </span>
        )}
        <span className="min-w-0">
          <span className={`block font-semibold text-heading ${compact ? 'text-sm' : 'text-base'}`}>{title}</span>
          {description && <span className="block text-sm text-muted mt-0.5 leading-snug">{description}</span>}
        </span>
      </span>
    </button>
  );
}
