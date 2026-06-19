'use client';

import { useState } from 'react';

/** Inline editor for the account display name. */
export default function ProfileEditor({ initial }: { initial: string }) {
  const [name, setName] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const save = async () => {
    setSaving(true);
    setSaved(false);
    const res = await fetch('/api/account/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ display_name: name }),
    });
    setSaving(false);
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium text-secondary mb-1.5">Display name</label>
      <div className="flex gap-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={50}
          placeholder="Your name"
          className="flex-1 px-4 py-2.5 rounded-xl border border-hairline bg-surface text-heading placeholder-faint focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent"
        />
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="shrink-0 px-4 py-2.5 bg-teal-500 hover:bg-teal-600 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-60 cursor-pointer"
        >
          {saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save'}
        </button>
      </div>
      <p className="text-xs text-faint mt-1.5">Auto-fills your name when creating or joining events.</p>
    </div>
  );
}
