import type { MetadataRoute } from 'next';

/**
 * Explicitly allow all crawlers, including social link-preview bots
 * (facebookexternalhit, Twitterbot, Slackbot, LinkedInBot, etc.). Event pages
 * are public and meant to be shared. Sitemap points at the canonical site URL.
 */
export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || '';
  return {
    rules: [{ userAgent: '*', allow: '/' }],
    ...(siteUrl ? { host: siteUrl } : {}),
  };
}
