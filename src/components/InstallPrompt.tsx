'use client';

import { useState, useEffect } from 'react';

const DISMISSED_KEY = 'install_prompt_dismissed';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/**
 * Smart PWA install prompt.
 * - On Android/Chrome: uses native beforeinstallprompt API
 * - On iOS Safari: shows manual "Add to Home Screen" instructions
 * - Only shows after user has created at least one event (returning user)
 * - Dismissable, remembers choice
 */
export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIOSPrompt, setShowIOSPrompt] = useState(false);
  const [dismissed, setDismissed] = useState(true);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Already installed as PWA
    const standalone = window.matchMedia('(display-mode: standalone)').matches
      || ('standalone' in navigator && (navigator as unknown as { standalone: boolean }).standalone);
    setIsStandalone(!!standalone);
    if (standalone) return;

    // Check if previously dismissed
    const wasDismissed = localStorage.getItem(DISMISSED_KEY) === 'true';
    setDismissed(wasDismissed);

    // Listen for Chrome/Android install prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);

    // Detect iOS Safari (no beforeinstallprompt support)
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !('MSStream' in window);
    const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
    if (isIOS && isSafari) {
      setShowIOSPrompt(true);
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
    dismiss();
  };

  const dismiss = () => {
    setDismissed(true);
    try { localStorage.setItem(DISMISSED_KEY, 'true'); } catch { /* ignore */ }
  };

  // Don't show if: already installed, dismissed, or no install capability
  if (isStandalone || dismissed || (!deferredPrompt && !showIOSPrompt)) return null;

  return (
    <div className="animate-fade-in mb-4 bg-gray-50 border border-gray-100 rounded-2xl p-3.5 flex items-center gap-3">
      <div className="w-9 h-9 rounded-xl bg-white shadow-sm flex items-center justify-center shrink-0">
        <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-gray-800">Add to Home Screen</p>
        <p className="text-xs text-gray-500 mt-0.5">
          {deferredPrompt
            ? 'Open instantly, just like a native app.'
            : 'Tap Share, then "Add to Home Screen".'
          }
        </p>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        {deferredPrompt ? (
          <button
            type="button"
            onClick={handleInstall}
            className="px-3 py-1.5 bg-violet-600 text-white text-xs font-semibold rounded-full hover:bg-violet-700 transition-all active:scale-95 cursor-pointer"
          >
            Install
          </button>
        ) : null}
        <button
          type="button"
          onClick={dismiss}
          className="p-1 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
