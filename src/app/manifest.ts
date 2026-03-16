import type { MetadataRoute } from 'next';
import { getSettings } from '@/lib/settings';

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
    theme_color: '#14b8a6',
    icons: [
      // Use favicon from settings if available, otherwise omit
      ...(settings.seo.favicon
        ? [
            {
              src: settings.seo.favicon.split('?')[0], // strip cache-bust for manifest
              sizes: 'any',
              type: 'image/png',
            },
          ]
        : []),
    ],
  };
}
