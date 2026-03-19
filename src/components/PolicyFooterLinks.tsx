import { getSettings } from '@/lib/settings';

export default async function PolicyFooterLinks() {
  const settings = await getSettings();
  const { legal } = settings;

  const links = [
    { show: legal?.show_privacy, href: '/privacy', label: 'Privacy Policy' },
    { show: legal?.show_terms, href: '/terms', label: 'Terms of Use' },
    { show: legal?.show_cookies, href: '/cookies', label: 'Cookie Policy' },
  ].filter((l) => l.show);

  if (links.length === 0) return null;

  return (
    <div className="flex items-center justify-center gap-3 flex-wrap">
      {links.map((link, i) => (
        <span key={link.href} className="flex items-center gap-3">
          {i > 0 && <span className="text-gray-200">·</span>}
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
