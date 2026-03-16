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

  return {
    name: siteName,
    short_name: siteName,
    description: settings.seo.og_description || 'Find a time that works for everyone',
    start_url: '/',
    display: 'standalone',
    background_color: '#f9fafb',
    theme_color: settings.branding.accent_color || '#14b8a6',
    icons: [
      ...(settings.seo.favicon
        ? [
            {
              src: settings.seo.favicon.split('?')[0],
              sizes: 'any',
              type: getIconType(settings.seo.favicon),
            },
          ]
        : []),
    ],
  };
}
