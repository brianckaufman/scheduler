'use client';

import type { ButtonHTMLAttributes } from 'react';

type Accent = 'social' | 'teal' | 'neutral';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** No ghost/text variant on purpose — everything interactive must look pressable. */
  variant?: 'primary' | 'secondary' | 'outline';
  accent?: Accent;
  size?: 'md' | 'lg';
  fullWidth?: boolean;
  loading?: boolean;
}

const PRIMARY: Record<Accent, string> = {
  social: 'bg-social-500 hover:bg-social-600 text-white shadow-lg shadow-social-200/50 dark:shadow-none',
  teal: 'bg-teal-500 hover:bg-teal-600 text-white shadow-lg shadow-teal-200/50 dark:shadow-none',
  neutral: 'bg-heading text-surface hover:opacity-90 shadow-lg shadow-black/10',
};

const OUTLINE: Record<Accent, string> = {
  social: 'border-2 border-social-500 text-social-600 hover:bg-social-50 dark:hover:bg-social-500/10',
  teal: 'border-2 border-teal-500 text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-500/10',
  neutral: 'border-2 border-strong text-body hover:bg-fill',
};

/**
 * The one true button. Guarantees an unmistakable "this is pressable"
 * affordance: fill or 2px border, generous padding, press-down scale.
 * Non-interactive text should never be styled to resemble this.
 */
export default function Button({
  variant = 'primary',
  accent = 'neutral',
  size = 'md',
  fullWidth = false,
  loading = false,
  disabled,
  className = '',
  children,
  ...rest
}: ButtonProps) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-2xl font-semibold transition-all duration-200 active:scale-[0.97] cursor-pointer select-none';
  const sizing = size === 'lg' ? 'py-4 px-5 text-base min-h-[52px]' : 'py-3 px-4 text-sm min-h-[44px]';
  const look = disabled || loading
    ? 'bg-fill text-faint cursor-not-allowed active:scale-100 shadow-none border-transparent'
    : variant === 'primary'
      ? PRIMARY[accent]
      : variant === 'outline'
        ? OUTLINE[accent]
        : 'bg-fill text-body border border-hairline hover:bg-fill2';

  return (
    <button
      type="button"
      disabled={disabled || loading}
      className={`${base} ${sizing} ${look} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...rest}
    >
      {loading && (
        <svg className="animate-spin w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {children}
    </button>
  );
}
