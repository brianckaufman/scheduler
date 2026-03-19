import type { MetadataRoute } from 'next';
import { getSettings } from '@/lib/settings';

function getIconType(url: string): string {
  const clean = url.split('?')[0];
  const ext = clean.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'svg': return 'image/svg+xml';
    case 'ico': return 'image/x-icon';
    case 'png': return 'image/png';
    case 'jpg':
    case 'jpeg': return 'image/jpeg';
    case 'webp': return 'image/webp';
    default: return 'image/png';
  }
}

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const settings = await getSettings();
  const siteName = settings.seo.site_name || 'Scheduler';

  const icons: MetadataRoute.Manifest['icons'] = [];

  // Android / PWA icon (512x512 maskable)
  if (settings.seo.android_icon) {
    icons.push(
      {
        src: settings.seo.android_icon.split('?')[0],
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: settings.seo.android_icon.split('?')[0],
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: settings.seo.android_icon.split('?')[0],
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      }
    );
  }

  // Apple touch icon (180x180)
  if (settings.seo.apple_icon) {
    icons.push({
      src: settings.seo.apple_icon.split('?')[0],
      sizes: '180x180',
      type: 'image/png',
    });
  }

  // Fallback to favicon
  if (icons.length === 0 && settings.seo.favicon) {
    icons.push({
      src: settings.seo.favicon.split('?')[0],
      sizes: 'any',
      type: getIconType(settings.seo.favicon),
    });
  }

  return {
    name: siteName,
    short_name: siteName,
    description: settings.seo.og_description || 'Find a time that works for everyone',
    start_url: '/',
    display: 'standalone',
    background_color: '#f9fafb',
    theme_color: settings.branding.accent_color || '#14b8a6',
    icons,
  };
}
