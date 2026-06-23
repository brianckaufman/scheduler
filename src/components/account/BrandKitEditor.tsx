'use client';

import { useEffect, useRef, useState } from 'react';
import EventColorPicker from '@/components/EventColorPicker';
import { loadImageFromFile, resizeToBlob } from '@/lib/imageProcess';

/**
 * Account-level brand kit — logo + brand color that new events inherit.
 * (Independent icon-tint overrides live in the data model for a fast-follow;
 * the v1 UI exposes brand color only.)
 */
export default function BrandKitEditor() {
  const [brandColor, setBrandColor] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/account/brand-kit')
      .then((r) => r.json())
      .then((d) => {
        if (d.brandKit) { setBrandColor(d.brandKit.brand_color || ''); setLogoUrl(d.brandKit.logo_url || ''); }
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  const onLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploading(true);
    try {
      let toSend: File = file;
      if (file.type !== 'image/svg+xml') {
        const img = await loadImageFromFile(file);
        const { blob, ext } = await resizeToBlob(img, 480, 240);
        toSend = new File([blob], `logo.${ext}`, { type: blob.type });
      }
      const fd = new FormData();
      fd.append('file', toSend);
      const res = await fetch('/api/account/brand-kit/logo', { method: 'POST', body: fd });
      const d = await res.json().catch(() => ({}));
      if (res.ok) setLogoUrl(d.url);
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    setSaving(true); setSaved(false);
    try {
      const res = await fetch('/api/account/brand-kit', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brand_color: brandColor || null, logo_url: logoUrl || null }),
      });
      if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 2000); }
    } finally {
      setSaving(false);
    }
  };

  if (!loaded) return <p className="text-sm text-faint">Loading…</p>;

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted">New events you create start from these defaults — you can still override per event.</p>

      <div>
        <label className="block text-sm font-medium text-body mb-1.5">Logo</label>
        <div className="flex items-center gap-3">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt="" className="h-12 w-auto max-w-[160px] object-contain rounded-field bg-fill p-1" />
          ) : (
            <div className="h-12 w-28 rounded-field border border-dashed border-strong bg-subtle flex items-center justify-center text-xs text-faint">No logo</div>
          )}
          <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className="text-xs font-semibold text-accent-fg hover:underline disabled:opacity-50 cursor-pointer">
            {uploading ? 'Uploading…' : logoUrl ? 'Replace' : 'Upload'}
          </button>
          {logoUrl && (
            <button type="button" onClick={() => setLogoUrl('')} className="text-xs text-faint hover:text-red-500 transition-colors cursor-pointer">Remove</button>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif" onChange={onLogo} className="hidden" />
      </div>

      <EventColorPicker value={brandColor} onChange={setBrandColor} />

      <div className="flex items-center gap-3">
        <button type="button" onClick={save} disabled={saving} className="px-4 py-2 rounded-field bg-social-500 text-white text-sm font-semibold hover:bg-social-600 disabled:opacity-50 cursor-pointer">
          {saving ? 'Saving…' : 'Save brand kit'}
        </button>
        {saved && <span className="text-xs text-success-fg">Saved ✓</span>}
      </div>
    </div>
  );
}
