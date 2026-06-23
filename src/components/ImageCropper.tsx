'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { cropToBlob } from '@/lib/imageProcess';

/**
 * Drag-to-position + zoom crop modal. The image must always cover the fixed
 * crop window (no gaps), and exports a downscaled web-ready blob at outWidth ×
 * (outWidth / aspect).
 */
export default function ImageCropper({
  file,
  aspect,
  outWidth,
  onCancel,
  onCropped,
}: {
  file: File;
  aspect: number;
  outWidth: number;
  onCancel: () => void;
  onCropped: (blob: Blob, ext: string) => void;
}) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [busy, setBusy] = useState(false);
  const drag = useRef<{ px: number; py: number; ox: number; oy: number } | null>(null);

  const winW = 304;
  const winH = Math.round(winW / aspect);

  const baseScale = img ? Math.max(winW / img.naturalWidth, winH / img.naturalHeight) : 1;
  const effScale = baseScale * zoom;
  const dispW = img ? img.naturalWidth * effScale : 0;
  const dispH = img ? img.naturalHeight * effScale : 0;

  const clamp = useCallback(
    (o: { x: number; y: number }) => ({
      x: Math.min(0, Math.max(winW - dispW, o.x)),
      y: Math.min(0, Math.max(winH - dispH, o.y)),
    }),
    [dispW, dispH, winW, winH],
  );

  // Own the object URL so the displayed <img> stays valid until unmount.
  useEffect(() => {
    const url = URL.createObjectURL(file);
    const i = new Image();
    i.onload = () => setImg(i);
    i.onerror = () => onCancel();
    i.src = url;
    return () => { URL.revokeObjectURL(url); };
  }, [file, onCancel]);

  // Center on load, re-clamp when zoom changes.
  useEffect(() => {
    if (img) setOffset(clamp({ x: (winW - dispW) / 2, y: (winH - dispH) / 2 }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [img]);
  useEffect(() => {
    setOffset((o) => clamp(o));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom]);

  const onMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    setOffset(clamp({ x: drag.current.ox + (e.clientX - drag.current.px), y: drag.current.oy + (e.clientY - drag.current.py) }));
  };

  const confirm = async () => {
    if (!img) return;
    setBusy(true);
    try {
      const outH = Math.round(outWidth / aspect);
      const { blob, ext } = await cropToBlob(
        img,
        { x: -offset.x / effScale, y: -offset.y / effScale, w: winW / effScale, h: winH / effScale },
        outWidth,
        outH,
      );
      onCropped(blob, ext);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 animate-fade-in"
      onPointerMove={onMove}
      onPointerUp={() => { drag.current = null; }}
    >
      <div className="bg-surface rounded-card p-4 w-full max-w-sm space-y-4 shadow-float">
        <p className="text-sm font-semibold text-heading">Position &amp; crop</p>
        <p className="text-xs text-muted -mt-2">Drag to reposition, slide to zoom. The photo fills the frame.</p>

        <div
          className="mx-auto rounded-card overflow-hidden bg-fill2 touch-none select-none cursor-grab active:cursor-grabbing"
          style={{ width: winW, height: winH }}
          onPointerDown={(e) => { drag.current = { px: e.clientX, py: e.clientY, ox: offset.x, oy: offset.y }; }}
        >
          {img && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={img.src}
              alt=""
              draggable={false}
              style={{ width: dispW, height: dispH, maxWidth: 'none', transform: `translate(${offset.x}px, ${offset.y}px)` }}
            />
          )}
        </div>

        <input
          type="range"
          min={1}
          max={4}
          step={0.01}
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          aria-label="Zoom"
          className="w-full accent-social-500 cursor-pointer"
        />

        <div className="flex gap-2">
          <button type="button" onClick={onCancel} className="flex-1 py-2 rounded-field border border-hairline text-sm text-secondary hover:bg-subtle transition-colors cursor-pointer">Cancel</button>
          <button type="button" onClick={confirm} disabled={busy || !img} className="flex-1 py-2 rounded-field bg-social-500 text-white text-sm font-semibold hover:bg-social-600 disabled:opacity-50 cursor-pointer">
            {busy ? 'Processing…' : 'Use photo'}
          </button>
        </div>
      </div>
    </div>
  );
}
