'use client';

import { useEffect, useState } from 'react';
import type { ThemePref } from '@/components/ThemeManager';

const OPTIONS: { value: ThemePref; label: string; icon: React.ReactNode }[] = [
  {
    value: 'system',
    label: 'Auto',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <rect x="3" y="4" width="18" height="12" rx="2" /><path strokeLinecap="round" d="M8 20h8M12 16v4" />
      </svg>
    ),
  },
  {
    value: 'light',
    label: 'Light',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <circle cx="12" cy="12" r="4" /><path strokeLinecap="round" d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41m11.32-11.32l1.41-1.41" />
      </svg>
    ),
  },
  {
    value: 'dark',
    label: 'Dark',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
      </svg>
    ),
  },
];

/** Three-way theme chooser (Auto / Light / Dark) for account settings. */
export default function ThemeSetting() {
  const [pref, setPref] = useState<ThemePref>('system');

  useEffect(() => {
    setPref((localStorage.getItem('theme') as ThemePref) || 'system');
  }, []);

  const choose = (value: ThemePref) => {
    setPref(value);
    try {
      localStorage.setItem('theme', value);
    } catch {
      /* ignore */
    }
    window.dispatchEvent(new Event('theme-change'));
  };

  return (
    <div>
      <label className="block text-sm font-medium text-secondary mb-1.5">Appearance</label>
      <div className="inline-flex rounded-xl border border-hairline p-1 bg-subtle">
        {OPTIONS.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => choose(o.value)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
              pref === o.value ? 'bg-surface text-heading shadow-sm' : 'text-muted hover:text-body'
            }`}
            aria-pressed={pref === o.value}
          >
            {o.icon}
            {o.label}
          </button>
        ))}
      </div>
      <p className="text-xs text-faint mt-1.5">Auto matches your device&apos;s light or dark setting.</p>
    </div>
  );
}
