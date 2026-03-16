import type { Metadata, Viewport } from 'next';
import { Geist } from 'next/font/google';
import './globals.css';
import { getSettings } from '@/lib/settings';
import { AnalyticsScripts } from '@/components/AnalyticsScripts';
import { CopyProvider } from '@/contexts/CopyContext';

const geist = Geist({
  variable: '--font-geist',
  subsets: ['latin'],
});

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();

  return {
    title: settings.seo.site_name || 'Scheduler',
    description: settings.seo.og_description || 'Find a time that works for everyone. No accounts needed.',
    icons: settings.seo.favicon ? { icon: settings.seo.favicon } : undefined,
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

  return (
    <html lang="en">
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
        <CopyProvider copy={settings.copy}>
          {children}
        </CopyProvider>
      </body>
    </html>
  );
}
