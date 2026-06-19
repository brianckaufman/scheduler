'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

/** Removes an event from the user's saved list. */
export default function RemoveSavedButton({ eventId }: { eventId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const remove = async () => {
    setBusy(true);
    const res = await fetch('/api/account/saved', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_id: eventId }),
    });
    if (res.ok) router.refresh();
    else setBusy(false);
  };

  return (
    <button
      type="button"
      onClick={remove}
      disabled={busy}
      className="shrink-0 text-xs text-faint hover:text-red-500 transition-colors cursor-pointer disabled:opacity-50"
      title="Remove from saved"
    >
      {busy ? '…' : 'Remove'}
    </button>
  );
}
