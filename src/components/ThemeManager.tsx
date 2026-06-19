'use client';

import { useEffect } from 'react';

export type ThemePref = 'light' | 'dark' | 'system';

/** Resolve + apply the stored theme to <html>. */
export function applyTheme() {
  let pref: ThemePref = 'system';
  try {
    pref = (localStorage.getItem('theme') as ThemePref) || 'system';
  } catch {
    /* ignore */
  }
  const dark =
    pref === 'dark' ||
    (pref === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', dark);
}

/**
 * Headless, app-wide theme controller. Keeps the .dark class in sync with the
 * stored preference (light/dark/system) and live OS changes when in system
 * mode. The theme is chosen in account settings via <ThemeSetting>, which
 * dispatches a `theme-change` event this listens for.
 */
export default function ThemeManager() {
  useEffect(() => {
    applyTheme();
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onSystem = () => {
      const pref = (localStorage.getItem('theme') as ThemePref) || 'system';
      if (pref === 'system') applyTheme();
    };
    mq.addEventListener('change', onSystem);
    window.addEventListener('theme-change', applyTheme);
    return () => {
      mq.removeEventListener('change', onSystem);
      window.removeEventListener('theme-change', applyTheme);
    };
  }, []);

  return null;
}
