import { Suspense } from 'react';
import Link from 'next/link';
import EventForm from '@/components/EventForm';
import HomeTabs from '@/components/HomeTabs';
import InstallPrompt from '@/components/InstallPrompt';
import Onboarding from '@/components/Onboarding';
import PolicyFooterLinks from '@/components/PolicyFooterLinks';
import Logo from '@/components/Logo';
import { getSettings } from '@/lib/settings';

export default async function Home() {
  const settings = await getSettings();
  const { copy: { home }, branding } = settings;
  const logoHeight = branding.logo_height || 40;

  return (
    <div className="min-h-screen bg-subtle">
      {/* First-time onboarding overlay */}
      <Onboarding />

      <div className="max-w-md mx-auto px-4 py-10">
        {/* Header */}
        <div className="text-center mb-8 stagger-children">
          {branding.logo_url && (
            <div className="mb-4 flex justify-center">
              <Logo height={logoHeight} />
            </div>
          )}
          {!branding.hide_home_title && (
            <h1 className="text-3xl font-bold text-heading mb-2 tracking-tight">
              {home.title}
            </h1>
          )}
          {!branding.hide_home_subtitle && (
            <p className="text-muted text-base leading-relaxed">
              {home.subtitle}
            </p>
          )}
        </div>

        {/* PWA install prompt for returning users */}
        <InstallPrompt />

        {/* Tabbed interface: New Event (default) / Your Events */}
        <HomeTabs>
          <div className="bg-surface rounded-2xl shadow-sm border border-hairline-soft p-6 animate-fade-in">
            <Suspense>
              <EventForm enableFixedEvents={settings.app.enable_fixed_events !== false} />
            </Suspense>
          </div>
        </HomeTabs>

        {/* See a live example — the two use cases at a glance */}
        <div className="mt-8 animate-fade-in">
          <p className="text-center text-xs font-semibold uppercase tracking-wide text-faint mb-3">See a live example</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Link href="/e/demo-family-thanksgiving"
              className="group block bg-surface rounded-2xl border border-hairline-soft p-4 hover:border-strong hover:shadow-sm transition-all active:scale-[0.99]">
              <span className="inline-block text-[11px] font-semibold text-social-fg bg-social-50 dark:bg-[#1C1939] px-2 py-0.5 rounded-full">Find a time</span>
              <p className="text-sm font-semibold text-heading mt-2 group-hover:text-accent-fg transition-colors">Family Thanksgiving Dinner</p>
              <p className="text-xs text-muted mt-0.5">Watch 7 schedules overlap to reveal the time that works for everyone.</p>
            </Link>
            <Link href="/e/demo-emma-birthday"
              className="group block bg-surface rounded-2xl border border-hairline-soft p-4 hover:border-strong hover:shadow-sm transition-all active:scale-[0.99]">
              <span className="inline-block text-[11px] font-semibold text-accent-fg bg-blue-50 dark:bg-[#0D223A] px-2 py-0.5 rounded-full">RSVP</span>
              <p className="text-sm font-semibold text-heading mt-2 group-hover:text-accent-fg transition-colors">Emma&apos;s 10th Birthday Party 🎉</p>
              <p className="text-xs text-muted mt-0.5">The date&apos;s set — see 25 guests reply yes, maybe, or can&apos;t make it.</p>
            </Link>
          </div>
        </div>

        {/* Footer: coffee + policy links */}
        <div className="mt-6">
          <PolicyFooterLinks />
        </div>
      </div>
    </div>
  );
}
