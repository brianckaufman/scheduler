/**
 * Image optimization utilities for Supabase Storage.
 *
 * Supabase supports on-the-fly image transforms via the
 * /render/image/public/ endpoint, BUT this requires the paid
 * Image Transformations add-on to be enabled on the project.
 *
 * These functions gracefully return the original URL if transforms
 * are not available, so images always load correctly.
 *
 * To enable optimized images:
 *   1. Enable Image Transformations in your Supabase dashboard
 *      (Settings > Add-ons > Image Transformations)
 *   2. Set NEXT_PUBLIC_SUPABASE_IMAGE_TRANSFORMS=true in .env.local
 */

const TRANSFORMS_ENABLED =
  typeof process !== 'undefined' &&
  process.env.NEXT_PUBLIC_SUPABASE_IMAGE_TRANSFORMS === 'true';

interface ImageTransformOptions {
  width?: number;
  height?: number;
  quality?: number; // 1-100
  resize?: 'cover' | 'contain' | 'fill';
}

/**
 * Rewrite a Supabase storage URL to use image transforms.
 * Non-Supabase URLs and SVGs are returned as-is.
 * If transforms are not enabled, returns the original URL unchanged.
 */
export function optimizedImageUrl(
  url: string,
  options: ImageTransformOptions
): string {
  if (!url) return '';

  // If transforms are not enabled, return original URL — don't break images
  if (!TRANSFORMS_ENABLED) return url;

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

/** Optimized logo: 2x resolution for retina, high quality */
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
