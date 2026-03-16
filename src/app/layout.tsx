import type { Metadata, Viewport } from 'next';
import { Geist } from 'next/font/google';
import './globals.css';
import { getSettings } from '@/lib/settings';
import { AnalyticsScripts } from '@/components/AnalyticsScripts';
import { CopyProvider } from '@/contexts/CopyContext';
import { BrandingProvider } from '@/contexts/BrandingContext';

const geist = Geist({
  variable: '--font-geist',
  subsets: ['latin'],
});

/** Detect MIME type from a favicon URL's file extension */
function getFaviconType(url: string): string {
  const clean = url.split('?')[0]; // strip query params
  const ext = clean.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'svg': return 'image/svg+xml';
    case 'ico': return 'image/x-icon';
    case 'png': return 'image/png';
    case 'jpg':
    case 'jpeg': return 'image/jpeg';
    case 'webp': return 'image/webp';
    case 'gif': return 'image/gif';
    default: return 'image/png';
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  const faviconUrl = settings.seo.favicon;

  // Build proper icon entries with type so browsers handle PNG/SVG/ICO correctly
  const icons: Metadata['icons'] = faviconUrl
    ? {
        icon: [
          {
            url: faviconUrl,
            type: getFaviconType(faviconUrl),
          },
        ],
        apple: [
          {
            url: faviconUrl,
          },
        ],
      }
    : undefined;

  return {
    title: settings.seo.site_name || 'Scheduler',
    description: settings.seo.og_description || 'Find a time that works for everyone. No accounts needed.',
    icons,
    openGraph: {
      title: settings.seo.og_title || settings.seo.site_name || 'Scheduler',
      description: settings.seo.og_description || 'Find a time that works for everyone.',
      siteName: settings.seo.site_name || 'Scheduler',
      ...(settings.seo.og_image ? { images: [{ url: settings.seo.og_image, width: 1200, height: 630 }] } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title: settings.seo.og_title || settings.seo.site_name || 'Scheduler',
      description: settings.seo.og_description || 'Find a time that works for everyone.',
      ...(settings.seo.og_image ? { images: [settings.seo.og_image] } : {}),
    },
    appleWebApp: {
      capable: true,
      statusBarStyle: 'default',
      title: settings.seo.site_name || 'Scheduler',
    },
  };
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const settings = await getSettings();
  const accentColor = settings.branding.accent_color || '#0d9488';

  return (
    <html
      lang="en"
      style={{ '--accent-base': accentColor } as React.CSSProperties}
    >
      <head>
        <AnalyticsScripts
          gaId={settings.analytics.ga_id}
          gtmId={settings.analytics.gtm_id}
          customScripts={settings.analytics.custom_head_scripts}
        />
      </head>
      <body className={`${geist.variable} font-sans antialiased`}>
        {settings.analytics.gtm_id && (
          <noscript>
            <iframe
              src={`https://www.googletagmanager.com/ns.html?id=${settings.analytics.gtm_id}`}
              height="0"
              width="0"
              style={{ display: 'none', visibility: 'hidden' }}
            />
          </noscript>
        )}
        <BrandingProvider
          branding={{
            logo_url: settings.branding.logo_url,
            logo_height: settings.branding.logo_height || 40,
            hide_home_title: settings.branding.hide_home_title || false,
            hide_home_subtitle: settings.branding.hide_home_subtitle || false,
            accent_color: accentColor,
            footer_text: settings.branding.footer_text,
            site_name: settings.seo.site_name || 'Scheduler',
          }}
        >
          <CopyProvider copy={settings.copy}>
            {children}
          </CopyProvider>
        </BrandingProvider>
      </body>
    </html>
  );
}
