'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

const KEY = 'cookie_consent';

/** Persist the choice to localStorage (UI) + a cookie (server reads it to gate analytics). */
function persist(value: 'accepted' | 'declined') {
  try {
    localStorage.setItem(KEY, value);
  } catch {
    /* ignore */
  }
  document.cookie = `${KEY}=${value}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
}

/**
 * Cookie consent banner. Essential cookies (auth/session) always run; analytics
 * cookies only load after the visitor accepts (the layout gates the analytics
 * scripts on the `cookie_consent` cookie this sets). Re-openable from the
 * "Cookie preferences" control via the `open-cookie-settings` event.
 */
export default function CookieConsent() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    let decided = false;
    try {
      decided = !!localStorage.getItem(KEY);
    } catch {
      /* ignore */
    }
    if (!decided) setShow(true);
    const reopen = () => setShow(true);
    window.addEventListener('open-cookie-settings', reopen);
    return () => window.removeEventListener('open-cookie-settings', reopen);
  }, []);

  if (!show) return null;

  const accept = () => {
    persist('accepted');
    setShow(false);
    // Reload so the server renders the (now consented) analytics scripts.
    window.location.reload();
  };
  const decline = () => {
    persist('declined');
    setShow(false);
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-[60] p-3 sm:p-4 pointer-events-none">
      <div className="mx-auto max-w-2xl bg-surface border border-hairline rounded-2xl shadow-lg p-4 sm:p-5 pointer-events-auto animate-fade-in">
        <p className="text-sm text-body leading-relaxed">
          We use <strong>essential cookies</strong> to run the app (including keeping you signed in).
          With your consent we also use <strong>analytics cookies</strong> to understand how the app is used.
          See our <Link href="/cookies" className="text-accent-fg font-medium hover:underline">Cookie Policy</Link>.
        </p>
        <div className="flex flex-col sm:flex-row gap-2 mt-3 sm:justify-end">
          <button
            type="button"
            onClick={decline}
            className="order-2 sm:order-1 py-2.5 px-4 rounded-xl border border-strong text-body text-sm font-medium hover:bg-subtle transition-colors cursor-pointer"
          >
            Decline analytics
          </button>
          <button
            type="button"
            onClick={accept}
            className="order-1 sm:order-2 py-2.5 px-5 rounded-xl bg-teal-500 hover:bg-teal-600 text-white text-sm font-semibold transition-colors active:scale-[0.98] cursor-pointer"
          >
            Accept all
          </button>
        </div>
      </div>
    </div>
  );
}
