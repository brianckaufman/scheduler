import { Suspense } from 'react';
import EventForm from '@/components/EventForm';
import HomeTabs from '@/components/HomeTabs';
import InstallPrompt from '@/components/InstallPrompt';
import Onboarding from '@/components/Onboarding';
import PolicyFooterLinks from '@/components/PolicyFooterLinks';
import { getSettings } from '@/lib/settings';
import { optimizedLogoUrl } from '@/lib/image';

export default async function Home() {
  const settings = await getSettings();
  const { copy: { home }, branding } = settings;
  const logoHeight = branding.logo_height || 40;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* First-time onboarding overlay */}
      <Onboarding />

      <div className="max-w-md mx-auto px-4 py-10">
        {/* Header */}
        <div className="text-center mb-8 stagger-children">
          {branding.logo_url && (
            <div className="mb-4 flex justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={optimizedLogoUrl(branding.logo_url, logoHeight)}
                alt={settings.seo.site_name || 'Logo'}
                style={{ height: `${logoHeight}px` }}
                className="w-auto object-contain"
              />
            </div>
          )}
          {!branding.hide_home_title && (
            <h1 className="text-3xl font-bold text-gray-900 mb-2 tracking-tight">
              {home.title}
            </h1>
          )}
          {!branding.hide_home_subtitle && (
            <p className="text-gray-500 text-base leading-relaxed">
              {home.subtitle}
            </p>
          )}
        </div>

        {/* PWA install prompt for returning users */}
        <InstallPrompt />

        {/* Tabbed interface: New Event (default) / Your Events */}
        <HomeTabs>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 animate-fade-in">
            <Suspense>
              <EventForm enableFixedEvents={settings.app.enable_fixed_events !== false} />
            </Suspense>
          </div>
        </HomeTabs>

        {/* Footer: coffee + policy links */}
        <div className="mt-6">
          <PolicyFooterLinks />
        </div>
      </div>
    </div>
  );
}
