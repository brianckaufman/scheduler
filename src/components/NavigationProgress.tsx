'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Thin top progress bar that gives instant motion feedback on navigation.
 * Starts on an internal link click, creeps toward the end, and completes when
 * the route actually changes. No dependencies, no router-event API needed.
 */
export default function NavigationProgress() {
  const pathname = usePathname();
  const [state, setState] = useState<'idle' | 'loading' | 'done'>('idle');

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as HTMLElement)?.closest?.('a');
      if (!a) return;
      if (a.target === '_blank' || a.hasAttribute('download')) return;
      try {
        const url = new URL((a as HTMLAnchorElement).href);
        if (url.origin === window.location.origin && url.pathname !== window.location.pathname) {
          setState('loading');
        }
      } catch {
        /* ignore */
      }
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, []);

  // The route changed → finish.
  useEffect(() => {
    setState((s) => (s === 'loading' ? 'done' : s));
  }, [pathname]);

  useEffect(() => {
    if (state !== 'done') return;
    const id = setTimeout(() => setState('idle'), 320);
    return () => clearTimeout(id);
  }, [state]);

  const width = state === 'loading' ? '85%' : state === 'done' ? '100%' : '0%';

  return (
    <div
      aria-hidden
      className="fixed top-0 left-0 right-0 z-[80] h-[3px] pointer-events-none"
      style={{ opacity: state === 'idle' ? 0 : 1, transition: 'opacity 200ms ease' }}
    >
      <div
        className="h-full bg-brand-gradient-ui rounded-r-full"
        style={{
          width,
          transition: state === 'loading' ? 'width 1.4s cubic-bezier(0.1,0.7,0.3,1)' : 'width 180ms ease-out',
        }}
      />
    </div>
  );
}
