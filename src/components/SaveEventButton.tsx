'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

/** Save/unsave the current event to the logged-in user's account. */
export default function SaveEventButton({ eventId }: { eventId: string }) {
  const { user, loading } = useAuth();
  const [saved, setSaved] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) { setSaved(null); return; }
    fetch(`/api/account/saved?event_id=${eventId}`)
      .then((r) => r.json())
      .then((d) => setSaved(!!d.saved))
      .catch(() => setSaved(false));
  }, [user, eventId]);

  // Don't render for logged-out visitors (accounts are optional/non-blocking).
  if (loading || !user) return null;

  const toggle = async () => {
    setBusy(true);
    const method = saved ? 'DELETE' : 'POST';
    const res = await fetch('/api/account/saved', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_id: eventId }),
    });
    if (res.ok) setSaved((s) => !s);
    setBusy(false);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy || saved === null}
      className={`inline-flex items-center gap-1.5 text-xs font-medium transition-colors cursor-pointer disabled:opacity-50 ${
        saved ? 'text-accent-fg' : 'text-faint hover:text-secondary'
      }`}
      title={saved ? 'Saved to your account' : 'Save to your account'}
    >
      <svg className="w-3.5 h-3.5" fill={saved ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
      </svg>
      {saved ? 'Saved' : 'Save event'}
    </button>
  );
}
