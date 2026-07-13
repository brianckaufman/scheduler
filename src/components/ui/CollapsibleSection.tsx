'use client';

import { useState } from 'react';
import { ChevronDownIcon } from './icons';

interface CollapsibleSectionProps {
  title: string;
  /** Short summary of what's inside, shown whether open or closed. Wraps naturally. */
  description?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

/**
 * A self-contained, independently-togglable settings group — the same
 * bordered-card language used for account-page sections, with a disclosure
 * chevron. Several can be open at once; opening one doesn't close others.
 */
export default function CollapsibleSection({ title, description, defaultOpen = false, children }: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="bg-surface rounded-2xl border border-hairline-soft overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left hover:bg-subtle transition-colors cursor-pointer"
        aria-expanded={isOpen}
      >
        <div className="min-w-0">
          <p className="text-sm font-semibold text-heading">{title}</p>
          {description && <p className="text-xs text-faint mt-0.5">{description}</p>}
        </div>
        <ChevronDownIcon className={`w-4 h-4 text-faint shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="px-4 pb-4 pt-1 space-y-4 border-t border-hairline-soft animate-slide-down">
          {children}
        </div>
      )}
    </div>
  );
}
