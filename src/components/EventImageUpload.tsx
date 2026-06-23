'use client';

import { useRef, useState } from 'react';

/**
 * Organizer-facing per-event image upload (logo or hero photo). Posts to
 * /api/events/[id]/upload, then hands the URL back via onChange so the
 * Customize panel can persist it on save.
 */
export default function EventImageUpload({
  eventId,
  organizerToken,
  kind,
  value,
  onChange,
  label,
  hint,
  aspect = 'photo',
}: {
  eventId: string;
  organizerToken: string;
  kind: 'logo' | 'photo';
  value: string;
  onChange: (url: string) => void;
  label: string;
  hint?: string;
  aspect?: 'photo' | 'logo';
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const pick = () => inputRef.current?.click();

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError('');
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('kind', kind);
      fd.append('organizer_token', organizerToken);
      const res = await fetch(`/api/events/${eventId}/upload`, { method: 'POST', body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error || 'Upload failed'); return; }
      onChange(data.url);
    } catch {
      setError('Upload failed');
    } finally {
      setBusy(false);
    }
  };

  const frame = aspect === 'photo'
    ? 'h-28 w-full rounded-card object-cover'
    : 'h-12 w-auto max-w-[160px] rounded-field object-contain bg-fill p-1';

  return (
    <div>
      <label className="block text-xs font-medium text-secondary mb-1.5">{label}</label>
      <div className="flex items-center gap-3">
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="" className={frame} />
        ) : (
          <div className={`${aspect === 'photo' ? 'h-28 w-full' : 'h-12 w-28'} rounded-card border border-dashed border-strong bg-subtle flex items-center justify-center text-xs text-faint`}>
            {aspect === 'photo' ? 'No photo' : 'No logo'}
          </div>
        )}
      </div>
      <div className="flex items-center gap-3 mt-2">
        <button
          type="button"
          onClick={pick}
          disabled={busy}
          className="text-xs font-semibold text-accent-fg hover:underline disabled:opacity-50 cursor-pointer"
        >
          {busy ? 'Uploading…' : value ? 'Replace' : 'Upload'}
        </button>
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="text-xs font-medium text-faint hover:text-red-500 transition-colors cursor-pointer"
          >
            Remove
          </button>
        )}
      </div>
      {hint && <p className="text-xs text-faint mt-1">{hint}</p>}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
      <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif" onChange={onFile} className="hidden" />
    </div>
  );
}
