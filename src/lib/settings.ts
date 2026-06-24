import { cache } from 'react';
import type { SiteSettings } from '@/types/settings';
import { DEFAULT_SETTINGS } from '@/types/settings';

/** Cache tag — call revalidateTag(SETTINGS_TAG) after an admin saves settings. */
export const SETTINGS_TAG = 'site-settings';

// Deep merge utility: merges source into target, preserving nested structure
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function deepMerge(target: any, source: any): any {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    const srcVal = source[key];
    const tgtVal = target[key];
    if (
      srcVal &&
      typeof srcVal === 'object' &&
      !Array.isArray(srcVal) &&
      tgtVal &&
      typeof tgtVal === 'object' &&
      !Array.isArray(tgtVal)
    ) {
      result[key] = deepMerge(tgtVal, srcVal);
    } else if (srcVal !== undefined) {
      result[key] = srcVal;
    }
  }
  return result;
}

export { deepMerge };

/**
 * Site settings (server-side). Previously this did an uncached Supabase DB read
 * on EVERY call — and it's called 3× per page request (metadata + layout +
 * page), serially, which dominated TTFB and produced a long blank screen.
 *
 * Now it's a plain REST fetch with Next's Data Cache (revalidate + tag), so:
 *  - it's served from cache across requests (no DB round-trip on the hot path), and
 *  - React's cache() dedupes the calls within a single request.
 * site_settings is global + rarely changes, so this is safe. The admin save
 * path should revalidateTag(SETTINGS_TAG) to push changes immediately.
 */
export const getSettings = cache(async (): Promise<SiteSettings> => {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return DEFAULT_SETTINGS;

    const res = await fetch(`${url}/rest/v1/site_settings?id=eq.1&select=settings`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      next: { revalidate: 60, tags: [SETTINGS_TAG] },
    });
    if (!res.ok) return DEFAULT_SETTINGS;

    const rows = (await res.json()) as { settings?: Partial<SiteSettings> }[];
    const settings = rows?.[0]?.settings;
    if (!settings) return DEFAULT_SETTINGS;

    return deepMerge(DEFAULT_SETTINGS, settings);
  } catch {
    return DEFAULT_SETTINGS;
  }
});
