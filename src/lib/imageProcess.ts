// Client-side image processing: crop + downscale + convert to a web-ready
// format (WebP, JPEG fallback). Keeps uploads small so events load fast.

export function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not load image')); };
    img.src = url;
  });
}

async function encode(canvas: HTMLCanvasElement, quality: number): Promise<{ blob: Blob; ext: string }> {
  const webp = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/webp', quality));
  if (webp && webp.type === 'image/webp') return { blob: webp, ext: 'webp' };
  // Safari < 14 etc. — fall back to JPEG.
  const jpeg = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', quality));
  if (jpeg) return { blob: jpeg, ext: 'jpg' };
  throw new Error('Could not encode image');
}

export interface SourceRect { x: number; y: number; w: number; h: number; }

/** Draw a source rectangle of the image into an outW×outH canvas → web-ready blob. */
export async function cropToBlob(
  img: HTMLImageElement,
  src: SourceRect,
  outW: number,
  outH: number,
  quality = 0.85,
): Promise<{ blob: Blob; ext: string }> {
  const canvas = document.createElement('canvas');
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unsupported');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, src.x, src.y, src.w, src.h, 0, 0, outW, outH);
  return encode(canvas, quality);
}

/** Downscale to fit within maxW×maxH (preserving aspect) → web-ready blob.
 *  Used for logos (no crop); WebP preserves transparency. */
export async function resizeToBlob(
  img: HTMLImageElement,
  maxW: number,
  maxH: number,
  quality = 0.9,
): Promise<{ blob: Blob; ext: string }> {
  const ratio = Math.min(1, maxW / img.naturalWidth, maxH / img.naturalHeight);
  const w = Math.max(1, Math.round(img.naturalWidth * ratio));
  const h = Math.max(1, Math.round(img.naturalHeight * ratio));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unsupported');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, w, h);
  return encode(canvas, quality);
}
