/**
 * Renders JSON-LD structured data for rich search results.
 * Used in the root layout for WebApplication schema
 * and event pages for Event schema.
 */

interface JsonLdProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: Record<string, any>;
}

export default function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

/**
 * WebApplication schema for the homepage.
 */
export function buildWebAppJsonLd({
  name,
  description,
  url,
}: {
  name: string;
  description: string;
  url?: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name,
    description,
    ...(url ? { url } : {}),
    applicationCategory: 'SchedulingApplication',
    operatingSystem: 'Any',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    browserRequirements: 'Requires JavaScript',
  };
}
