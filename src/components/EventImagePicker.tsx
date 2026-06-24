'use client';

import { useRef, useState } from 'react';
import ImageCropper from './ImageCropper';
import { loadImageFromFile, resizeToBlob } from '@/lib/imageProcess';

/**
 * Create-time image picker (deferred): crops/optimizes locally and hands the
 * resulting blob to the parent, which uploads it once the event exists. Same
 * crop + web-ready conversion as the Customize panel's EventImageUpload.
 */
export default function EventImagePicker({
  kind,
  preview,
  onPick,
  onClear,
  label,
  hint,
  aspect = 'photo',
}: {
  kind: 'photo' | 'logo';
  preview: string;
  onPick: (blob: Blob, ext: string) => void;
  onClear: () => void;
  label: string;
  hint?: string;
  aspect?: 'photo' | 'logo';
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError('');
    if (file.type === 'image/svg+xml') { onPick(file, 'svg'); return; }
    if (kind === 'photo') { setCropFile(file); return; }
    setBusy(true);
    try {
      const img = await loadImageFromFile(file);
      const { blob, ext } = await resizeToBlob(img, 480, 240);
      onPick(blob, ext);
    } catch {
      setError('Could not process image');
    } finally {
      setBusy(false);
    }
  };

  const frame = aspect === 'photo'
    ? 'h-28 w-full rounded-card object-cover'
    : 'h-12 w-auto max-w-[160px] rounded-field object-contain bg-fill p-1';

  return (
    <div>
      <label className="block text-sm font-medium text-body mb-1.5">{label}</label>
      {preview ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={preview} alt="" className={frame} />
      ) : (
        <div className={`${aspect === 'photo' ? 'h-28 w-full' : 'h-12 w-28'} rounded-card border border-dashed border-strong bg-subtle flex items-center justify-center text-xs text-faint`}>
          {aspect === 'photo' ? 'No photo' : 'No logo'}
        </div>
      )}
      <div className="flex items-center gap-3 mt-2">
        <button type="button" onClick={() => inputRef.current?.click()} disabled={busy} className="text-xs font-semibold text-accent-fg hover:underline disabled:opacity-50 cursor-pointer">
          {busy ? 'Processing…' : preview ? 'Replace' : 'Upload'}
        </button>
        {preview && (
          <button type="button" onClick={onClear} className="text-xs text-faint hover:text-red-500 transition-colors cursor-pointer">Remove</button>
        )}
      </div>
      {hint && <p className="text-xs text-faint mt-1">{hint}</p>}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
      <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif" onChange={onFile} className="hidden" />
      {cropFile && (
        <ImageCropper
          file={cropFile}
          aspect={2.64}
          outWidth={1200}
          onCancel={() => setCropFile(null)}
          onCropped={(blob, ext) => { setCropFile(null); onPick(blob, ext); }}
        />
      )}
    </div>
  );
}
