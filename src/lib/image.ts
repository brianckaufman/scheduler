/**
 * Image optimization utilities for Supabase Storage.
 *
 * Supabase supports on-the-fly image transforms via the
 * /render/image/public/ endpoint. This utility rewrites
 * standard /object/public/ URLs to use the transform endpoint
 * with the specified dimensions, quality, and format.
 *
 * If the URL is not a Supabase storage URL, it is returned unchanged.
 * If transforms are not enabled on the Supabase project, the browser
 * will simply load the original image (graceful degradation).
 */

interface ImageTransformOptions {
  width?: number;
  height?: number;
  quality?: number; // 1-100
  resize?: 'cover' | 'contain' | 'fill';
}

/**
 * Rewrite a Supabase storage URL to use image transforms.
 * Non-Supabase URLs and SVGs are returned as-is.
 */
export function optimizedImageUrl(
  url: string,
  options: ImageTransformOptions
): string {
  if (!url) return '';

  // Don't transform SVGs — they're already resolution-independent
  const cleanUrl = url.split('?')[0];
  if (cleanUrl.endsWith('.svg')) return url;

  // Only transform Supabase storage URLs
  if (!url.includes('supabase') || !url.includes('/storage/v1/object/public/')) {
    return url;
  }

  // Rewrite /object/public/ -> /render/image/public/
  const transformUrl = url.replace(
    '/storage/v1/object/public/',
    '/storage/v1/render/image/public/'
  );

  // Build transform query params
  const params = new URLSearchParams();
  if (options.width) params.set('width', String(options.width));
  if (options.height) params.set('height', String(options.height));
  if (options.quality) params.set('quality', String(options.quality));
  if (options.resize) params.set('resize', options.resize);

  // Separate existing query string (e.g. ?v=timestamp) from path
  const [basePath, existingQuery] = transformUrl.split('?');
  const allParams = new URLSearchParams(existingQuery || '');
  params.forEach((value, key) => allParams.set(key, value));

  return `${basePath}?${allParams.toString()}`;
}

// ── Presets ──────────────────────────────────────────────────────

/** Optimized logo: 2x resolution for retina, WebP, high quality */
export function optimizedLogoUrl(url: string, displayHeight: number): string {
  return optimizedImageUrl(url, {
    height: displayHeight * 2,
    quality: 85,
    resize: 'contain',
  });
}

/** Optimized OG image: 1200x630 standard, compressed */
export function optimizedOgImageUrl(url: string): string {
  return optimizedImageUrl(url, {
    width: 1200,
    height: 630,
    quality: 80,
    resize: 'cover',
  });
}

/** Optimized favicon: 64x64 for browser tabs */
export function optimizedFaviconUrl(url: string): string {
  return optimizedImageUrl(url, {
    width: 64,
    height: 64,
    quality: 90,
    resize: 'contain',
  });
}
