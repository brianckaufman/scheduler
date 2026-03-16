import type { Metadata, Viewport } from 'next';
import { Poppins } from 'next/font/google';
import './globals.css';
import { getSettings } from '@/lib/settings';
import { AnalyticsScripts } from '@/components/AnalyticsScripts';
import { CopyProvider } from '@/contexts/CopyContext';
import { BrandingProvider } from '@/contexts/BrandingContext';
import { MonetizationProvider } from '@/contexts/MonetizationContext';
import JsonLd, { buildWebAppJsonLd } from '@/components/JsonLd';
import { optimizedOgImageUrl, optimizedFaviconUrl } from '@/lib/image';

const poppins = Poppins({
  variable: '--font-poppins',
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
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
  const faviconUrl = settings.seo.favicon ? optimizedFaviconUrl(settings.seo.favicon) : '';
  const siteUrl = settings.seo.site_url || process.env.NEXT_PUBLIC_SITE_URL || '';
  const siteName = settings.seo.site_name || 'Scheduler';
  const ogTitle = settings.seo.og_title || siteName;
  const ogDesc = settings.seo.og_description || 'Find a time that works for everyone. No accounts needed.';

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
    // metadataBase lets Next.js resolve relative URLs in og:image, canonical, etc.
    ...(siteUrl ? { metadataBase: new URL(siteUrl) } : {}),
    title: siteName,
    description: ogDesc,
    icons,
    // Canonical URL prevents duplicate content issues
    ...(siteUrl ? { alternates: { canonical: siteUrl } } : {}),
    // Additional meta for search engines
    keywords: ['scheduling', 'group scheduling', 'free scheduling app', 'meeting planner', 'availability', 'no sign up'],
    authors: siteName !== 'Scheduler' ? [{ name: siteName }] : undefined,
    creator: siteName,
    publisher: siteName,
    // Open Graph — og:url, og:type, og:locale now included
    openGraph: {
      type: 'website',
      locale: 'en_US',
      ...(siteUrl ? { url: siteUrl } : {}),
      title: ogTitle,
      description: ogDesc,
      siteName,
      ...(settings.seo.og_image ? { images: [{ url: optimizedOgImageUrl(settings.seo.og_image), width: 1200, height: 630, alt: ogTitle }] } : {}),
    },
    // Twitter card
    twitter: {
      card: 'summary_large_image',
      title: ogTitle,
      description: ogDesc,
      ...(settings.seo.og_image ? { images: [{ url: optimizedOgImageUrl(settings.seo.og_image), alt: ogTitle }] } : {}),
      ...(settings.social.twitter_url ? { site: settings.social.twitter_url.split('/').pop() ? `@${settings.social.twitter_url.split('/').pop()}` : undefined } : {}),
    },
    // Facebook App ID (for fb:app_id OG tag)
    ...(settings.seo.fb_app_id ? { facebook: { appId: settings.seo.fb_app_id } } : {}),
    appleWebApp: {
      capable: true,
      statusBarStyle: 'default',
      title: siteName,
    },
    // Additional robot directives for SEO
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
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
  const siteName = settings.seo.site_name || 'Scheduler';
  const siteUrl = settings.seo.site_url || process.env.NEXT_PUBLIC_SITE_URL || '';
  const ogDesc = settings.seo.og_description || 'Find a time that works for everyone. No accounts needed.';

  return (
    <html
      lang="en"
      style={{ '--accent-base': accentColor } as React.CSSProperties}
    >
      <head>
        {/* JSON-LD structured data for rich search results */}
        <JsonLd data={buildWebAppJsonLd({ name: siteName, description: ogDesc, url: siteUrl || undefined })} />
        <AnalyticsScripts
          gaId={settings.analytics.ga_id}
          gtmId={settings.analytics.gtm_id}
          customScripts={settings.analytics.custom_head_scripts}
        />
      </head>
      <body className={`${poppins.variable} font-sans antialiased`}>
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
          <MonetizationProvider
            monetization={{
              buymeacoffee_url: settings.monetization.buymeacoffee_url || '',
              donation_cta: settings.monetization.donation_cta || 'Buy me a coffee ☕',
              donation_message: settings.monetization.donation_message || 'Love this app? Help keep it free!',
              show_on_home: settings.monetization.show_on_home !== false,
              show_on_event: settings.monetization.show_on_event !== false,
              show_on_success: settings.monetization.show_on_success !== false,
            }}
          >
            <CopyProvider copy={settings.copy}>
              {children}
            </CopyProvider>
          </MonetizationProvider>
        </BrandingProvider>
      </body>
    </html>
  );
}
