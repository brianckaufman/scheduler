import { Suspense } from 'react';
import EventForm from '@/components/EventForm';
import SupportBanner from '@/components/SupportBanner';
import HomeTabs from '@/components/HomeTabs';
import InstallPrompt from '@/components/InstallPrompt';
import Onboarding from '@/components/Onboarding';
import { getSettings } from '@/lib/settings';
import { optimizedLogoUrl } from '@/lib/image';

export default async function Home() {
  const settings = await getSettings();
  const { copy: { home }, branding, monetization } = settings;
  const logoHeight = branding.logo_height || 40;
  const showDonation = monetization.buymeacoffee_url && monetization.show_on_home !== false;

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
              <EventForm />
            </Suspense>
          </div>
        </HomeTabs>

        {/* Trust signals */}
        <div className="mt-8 mb-4">
          <div className="flex items-center justify-center gap-4 text-gray-400">
            <div className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              <span className="text-xs font-medium">Free forever</span>
            </div>
            <div className="w-px h-3 bg-gray-200" />
            <div className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span className="text-xs font-medium">No sign-up</span>
            </div>
            <div className="w-px h-3 bg-gray-200" />
            <div className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span className="text-xs font-medium">Private</span>
            </div>
          </div>
          {home.footer && (
            <p className="text-center text-[11px] text-gray-300 mt-3">{home.footer}</p>
          )}
        </div>

        {/* Donation link in footer */}
        {showDonation && (
          <SupportBanner
            url={monetization.buymeacoffee_url}
            cta={monetization.donation_cta || 'Buy me a coffee'}
            variant="inline"
          />
        )}
      </div>
    </div>
  );
}
