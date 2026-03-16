import { createClient } from '@/lib/supabase/server';
import type { SiteSettings } from '@/types/settings';
import { DEFAULT_SETTINGS } from '@/types/settings';

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

// Fetch settings from Supabase (server-side only)
// Uses Next.js fetch caching with revalidation
export async function getSettings(): Promise<SiteSettings> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('site_settings')
      .select('settings')
      .eq('id', 1)
      .single();

    if (error || !data?.settings) {
      return DEFAULT_SETTINGS;
    }

    // Deep merge with defaults so any missing keys get filled in
    return deepMerge(DEFAULT_SETTINGS, data.settings as Partial<SiteSettings>);
  } catch {
    return DEFAULT_SETTINGS;
  }
}
