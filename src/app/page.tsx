import Link from 'next/link';
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
          {settings.app.enable_fixed_events !== false ? (
            <div className="space-y-3 animate-fade-in">
              <Link
                href="/new?type=availability"
                className="w-full flex items-center gap-4 p-5 rounded-2xl border-2 border-hairline bg-surface hover:border-social-500 hover:bg-social-50 dark:hover:bg-[#1C1939] text-left transition-all duration-200 active:scale-[0.98] cursor-pointer group"
              >
                <span className="w-12 h-12 rounded-xl bg-social-100 dark:bg-[#1C1939] flex items-center justify-center shrink-0">
                  <svg className="w-6 h-6 text-social-fg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="10.5" cy="10.5" r="6.5" />
                    <path d="M19.5 19.5L15.5 15.5" />
                    <path d="M10.5 8v3l2 1.5" />
                  </svg>
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-base font-bold text-heading">Find a time</span>
                  <span className="block text-sm text-muted mt-0.5 leading-snug">Not sure when? Everyone marks when they&apos;re free, and you pick the best time.</span>
                </span>
                <svg className="w-5 h-5 text-faint2 group-hover:text-social-fg shrink-0 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </Link>

              <Link
                href="/new?type=fixed"
                className="w-full flex items-center gap-4 p-5 rounded-2xl border-2 border-hairline bg-surface hover:border-teal-500 hover:bg-blue-50 dark:hover:bg-[#0D223A] text-left transition-all duration-200 active:scale-[0.98] cursor-pointer group"
              >
                <span className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-[#0D223A] flex items-center justify-center shrink-0">
                  <svg className="w-6 h-6 text-accent-fg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-base font-bold text-heading">Event RSVP</span>
                  <span className="block text-sm text-muted mt-0.5 leading-snug">Date already set? Invite people and collect yes, maybe, or no replies.</span>
                </span>
                <svg className="w-5 h-5 text-faint2 group-hover:text-accent-fg shrink-0 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          ) : (
            <Link
              href="/new"
              className="block w-full text-center py-4 px-5 rounded-2xl bg-social-500 hover:bg-social-600 text-white text-base font-semibold shadow-lg shadow-social-200/50 dark:shadow-none transition-all duration-200 active:scale-[0.97] animate-fade-in"
            >
              Plan something →
            </Link>
          )}
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
