'use client';

import { useRef, useState } from 'react';

/** Avatar uploader for account settings: preview + upload + remove. */
export default function AvatarUpload({ initialUrl, name }: { initialUrl: string | null; name: string }) {
  const [url, setUrl] = useState<string | null>(initialUrl);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const initial = (name.trim()[0] || '?').toUpperCase();

  const pick = () => inputRef.current?.click();

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setError('');
    const form = new FormData();
    form.append('file', file);
    const res = await fetch('/api/account/avatar', { method: 'POST', body: form });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) { setError(data.error || 'Upload failed'); return; }
    setUrl(data.avatar_url);
    window.dispatchEvent(new CustomEvent('avatar-change', { detail: data.avatar_url }));
  };

  const remove = async () => {
    setBusy(true);
    await fetch('/api/account/avatar', { method: 'DELETE' });
    setBusy(false);
    setUrl(null);
    window.dispatchEvent(new CustomEvent('avatar-change', { detail: null }));
  };

  return (
    <div className="flex items-center gap-4">
      <div className="relative shrink-0">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={name} referrerPolicy="no-referrer" className="w-16 h-16 rounded-full object-cover border border-hairline" />
        ) : (
          <div className="w-16 h-16 rounded-full bg-teal-500 text-white flex items-center justify-center text-xl font-semibold">
            {initial}
          </div>
        )}
        {busy && <div className="absolute inset-0 rounded-full bg-black/30 flex items-center justify-center">
          <svg className="w-5 h-5 text-white animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>}
      </div>
      <div className="min-w-0">
        <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={onFile} className="hidden" />
        <div className="flex gap-2">
          <button type="button" onClick={pick} disabled={busy}
            className="px-3 py-1.5 text-sm font-medium rounded-lg border border-strong text-body hover:bg-subtle transition-colors cursor-pointer disabled:opacity-60">
            {url ? 'Change photo' : 'Upload photo'}
          </button>
          {url && (
            <button type="button" onClick={remove} disabled={busy}
              className="px-3 py-1.5 text-sm text-faint hover:text-red-500 transition-colors cursor-pointer disabled:opacity-60">
              Remove
            </button>
          )}
        </div>
        {error ? <p className="text-xs text-red-500 mt-1">{error}</p>
          : <p className="text-xs text-faint mt-1">Shown on events you organize. PNG, JPG, WebP, or GIF.</p>}
      </div>
    </div>
  );
}
