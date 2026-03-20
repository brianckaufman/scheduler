import { getSettings } from '@/lib/settings';

export default async function PolicyFooterLinks() {
  const settings = await getSettings();
  const { legal, monetization } = settings;

  const showCoffee = !!(monetization.buymeacoffee_url && monetization.show_on_home !== false);

  const links = [
    { show: legal?.show_privacy, href: '/privacy', label: 'Privacy Policy' },
    { show: legal?.show_terms, href: '/terms', label: 'Terms of Use' },
    { show: legal?.show_cookies, href: '/cookies', label: 'Cookie Policy' },
  ].filter((l) => l.show);

  if (!showCoffee && links.length === 0) return null;

  return (
    <div className="flex items-center justify-center gap-3 flex-wrap py-1">
      {showCoffee && (
        <>
          <a
            href={monetization.buymeacoffee_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-amber-500 transition-colors"
          >
            <svg className="w-4 h-4 text-red-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
            </svg>
            {monetization.donation_cta || 'Buy me a coffee'}
          </a>
          {links.length > 0 && <span className="text-gray-200 select-none">·</span>}
        </>
      )}
      {links.map((link, i) => (
        <span key={link.href} className="flex items-center gap-3">
          {i > 0 && <span className="text-gray-200 select-none">·</span>}
          <a
            href={link.href}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            {link.label}
          </a>
        </span>
      ))}
    </div>
  );
}
