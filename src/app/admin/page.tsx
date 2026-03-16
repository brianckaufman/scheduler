'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { SiteSettings } from '@/types/settings';
import { DEFAULT_SETTINGS } from '@/types/settings';

type TabKey = 'seo' | 'branding' | 'monetization' | 'analytics' | 'social' | 'app';

const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: 'seo', label: 'SEO', icon: '🔍' },
  { key: 'branding', label: 'Branding', icon: '🎨' },
  { key: 'monetization', label: 'Monetization', icon: '💰' },
  { key: 'analytics', label: 'Analytics', icon: '📊' },
  { key: 'social', label: 'Social', icon: '🔗' },
  { key: 'app', label: 'App Settings', icon: '⚙️' },
];

export default function AdminDashboard() {
  const router = useRouter();
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SETTINGS);
  const [activeTab, setActiveTab] = useState<TabKey>('seo');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [originalSettings, setOriginalSettings] = useState<SiteSettings>(DEFAULT_SETTINGS);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/settings');
      if (res.status === 401) {
        router.push('/admin/login');
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
        setOriginalSettings(data);
      }
    } catch {
      // If fetch fails, use defaults
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const updateSection = <K extends keyof SiteSettings>(
    section: K,
    field: keyof SiteSettings[K],
    value: string | number
  ) => {
    setSettings((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value,
      },
    }));
    setHasChanges(true);
    setSaveMessage('');
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveMessage('');

    try {
      // Only send the active tab's section to avoid overwriting other sections
      const sectionUpdate = { [activeTab]: settings[activeTab] };

      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sectionUpdate),
      });

      if (res.status === 401) {
        router.push('/admin/login');
        return;
      }

      if (!res.ok) throw new Error('Failed to save');

      setOriginalSettings({ ...settings });
      setHasChanges(false);
      setSaveMessage('Settings saved successfully');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch {
      setSaveMessage('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    setSettings({ ...originalSettings });
    setHasChanges(false);
    setSaveMessage('');
  };

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.push('/admin/login');
  };

  const inputClass =
    'w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent text-gray-900 text-sm';
  const labelClass = 'block text-sm font-medium text-gray-700 mb-1';
  const helpClass = 'text-xs text-gray-400 mt-1';

  const renderSEO = () => (
    <div className="space-y-5">
      <div>
        <label className={labelClass}>Site Name</label>
        <input
          className={inputClass}
          value={settings.seo.site_name}
          onChange={(e) => updateSection('seo', 'site_name', e.target.value)}
          placeholder="Scheduler"
        />
        <p className={helpClass}>Displayed in browser tabs and search results</p>
      </div>
      <div>
        <label className={labelClass}>OG Title</label>
        <input
          className={inputClass}
          value={settings.seo.og_title}
          onChange={(e) => updateSection('seo', 'og_title', e.target.value)}
          placeholder="Scheduler"
        />
        <p className={helpClass}>Title shown when sharing links on social media</p>
      </div>
      <div>
        <label className={labelClass}>OG Description</label>
        <textarea
          className={inputClass + ' resize-none'}
          rows={3}
          value={settings.seo.og_description}
          onChange={(e) => updateSection('seo', 'og_description', e.target.value)}
          placeholder="Find a time that works for everyone."
        />
        <p className={helpClass}>Description shown when sharing links on social media</p>
      </div>
      <div>
        <label className={labelClass}>OG Image URL</label>
        <input
          className={inputClass}
          value={settings.seo.og_image}
          onChange={(e) => updateSection('seo', 'og_image', e.target.value)}
          placeholder="https://yourdomain.com/og-image.png"
        />
        <p className={helpClass}>1200x630px recommended. Used as the preview image when sharing links.</p>
      </div>
      <div>
        <label className={labelClass}>Favicon URL</label>
        <input
          className={inputClass}
          value={settings.seo.favicon}
          onChange={(e) => updateSection('seo', 'favicon', e.target.value)}
          placeholder="/favicon.ico"
        />
        <p className={helpClass}>Path or URL to your favicon file</p>
      </div>
    </div>
  );

  const renderBranding = () => (
    <div className="space-y-5">
      <div>
        <label className={labelClass}>Logo URL</label>
        <input
          className={inputClass}
          value={settings.branding.logo_url}
          onChange={(e) => updateSection('branding', 'logo_url', e.target.value)}
          placeholder="https://yourdomain.com/logo.svg"
        />
        <p className={helpClass}>URL to your logo image (SVG or PNG recommended)</p>
      </div>
      <div>
        <label className={labelClass}>Accent Color</label>
        <div className="flex gap-3 items-center">
          <input
            type="color"
            value={settings.branding.accent_color}
            onChange={(e) => updateSection('branding', 'accent_color', e.target.value)}
            className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer"
          />
          <input
            className={inputClass}
            value={settings.branding.accent_color}
            onChange={(e) => updateSection('branding', 'accent_color', e.target.value)}
            placeholder="#0d9488"
          />
        </div>
        <p className={helpClass}>Primary accent color used throughout the app</p>
      </div>
      <div>
        <label className={labelClass}>Footer Text</label>
        <input
          className={inputClass}
          value={settings.branding.footer_text}
          onChange={(e) => updateSection('branding', 'footer_text', e.target.value)}
          placeholder="Free forever. No sign-up. No spam."
        />
      </div>
    </div>
  );

  const renderMonetization = () => (
    <div className="space-y-5">
      <div>
        <label className={labelClass}>Buy Me a Coffee URL</label>
        <input
          className={inputClass}
          value={settings.monetization.buymeacoffee_url}
          onChange={(e) => updateSection('monetization', 'buymeacoffee_url', e.target.value)}
          placeholder="https://buymeacoffee.com/yourusername"
        />
        <p className={helpClass}>Leave empty to hide the donation button</p>
      </div>
      <div>
        <label className={labelClass}>Donation CTA Text</label>
        <input
          className={inputClass}
          value={settings.monetization.donation_cta}
          onChange={(e) => updateSection('monetization', 'donation_cta', e.target.value)}
          placeholder="Buy me a coffee"
        />
        <p className={helpClass}>Text shown on the donation button</p>
      </div>
    </div>
  );

  const renderAnalytics = () => (
    <div className="space-y-5">
      <div>
        <label className={labelClass}>Google Analytics ID</label>
        <input
          className={inputClass}
          value={settings.analytics.ga_id}
          onChange={(e) => updateSection('analytics', 'ga_id', e.target.value)}
          placeholder="G-XXXXXXXXXX"
        />
        <p className={helpClass}>Your GA4 Measurement ID (starts with G-)</p>
      </div>
      <div>
        <label className={labelClass}>Google Tag Manager ID</label>
        <input
          className={inputClass}
          value={settings.analytics.gtm_id}
          onChange={(e) => updateSection('analytics', 'gtm_id', e.target.value)}
          placeholder="GTM-XXXXXXX"
        />
        <p className={helpClass}>Your GTM Container ID (starts with GTM-)</p>
      </div>
      <div>
        <label className={labelClass}>Custom Head Scripts</label>
        <textarea
          className={inputClass + ' font-mono text-xs resize-none'}
          rows={6}
          value={settings.analytics.custom_head_scripts}
          onChange={(e) => updateSection('analytics', 'custom_head_scripts', e.target.value)}
          placeholder={'<!-- Paste any tracking scripts here -->\n<script>...</script>'}
        />
        <p className={helpClass}>
          Raw HTML/scripts injected into the {'<head>'}. Use for Meta Pixel, Hotjar, etc.
        </p>
      </div>
    </div>
  );

  const renderSocial = () => (
    <div className="space-y-5">
      <div>
        <label className={labelClass}>Twitter / X URL</label>
        <input
          className={inputClass}
          value={settings.social.twitter_url}
          onChange={(e) => updateSection('social', 'twitter_url', e.target.value)}
          placeholder="https://x.com/yourusername"
        />
      </div>
      <div>
        <label className={labelClass}>Instagram URL</label>
        <input
          className={inputClass}
          value={settings.social.instagram_url}
          onChange={(e) => updateSection('social', 'instagram_url', e.target.value)}
          placeholder="https://instagram.com/yourusername"
        />
      </div>
      <div>
        <label className={labelClass}>TikTok URL</label>
        <input
          className={inputClass}
          value={settings.social.tiktok_url}
          onChange={(e) => updateSection('social', 'tiktok_url', e.target.value)}
          placeholder="https://tiktok.com/@yourusername"
        />
      </div>
      <div>
        <label className={labelClass}>Default Share Text</label>
        <textarea
          className={inputClass + ' resize-none'}
          rows={2}
          value={settings.social.share_default_text}
          onChange={(e) => updateSection('social', 'share_default_text', e.target.value)}
          placeholder="Help me find a time that works!"
        />
        <p className={helpClass}>Pre-filled text when participants use the native share button</p>
      </div>
    </div>
  );

  const renderAppSettings = () => (
    <div className="space-y-5">
      <div>
        <label className={labelClass}>Default Event Duration (minutes)</label>
        <select
          className={inputClass}
          value={settings.app.default_duration}
          onChange={(e) => updateSection('app', 'default_duration', Number(e.target.value))}
        >
          <option value={10}>10 minutes</option>
          <option value={15}>15 minutes</option>
          <option value={30}>30 minutes</option>
          <option value={45}>45 minutes</option>
          <option value={60}>1 hour</option>
          <option value={90}>1.5 hours</option>
          <option value={120}>2 hours</option>
        </select>
        <p className={helpClass}>Default duration pre-selected when creating new events</p>
      </div>
      <div>
        <label className={labelClass}>Max Participants Per Event</label>
        <input
          type="number"
          className={inputClass}
          value={settings.app.max_participants}
          onChange={(e) => updateSection('app', 'max_participants', Number(e.target.value))}
          min={2}
          max={500}
        />
        <p className={helpClass}>Maximum number of participants allowed per event</p>
      </div>
      <div>
        <label className={labelClass}>Rate Limit (events per hour per IP)</label>
        <input
          type="number"
          className={inputClass}
          value={settings.app.rate_limit_events_per_hour}
          onChange={(e) => updateSection('app', 'rate_limit_events_per_hour', Number(e.target.value))}
          min={1}
          max={100}
        />
        <p className={helpClass}>How many events a single IP can create per hour</p>
      </div>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'seo': return renderSEO();
      case 'branding': return renderBranding();
      case 'monetization': return renderMonetization();
      case 'analytics': return renderAnalytics();
      case 'social': return renderSocial();
      case 'app': return renderAppSettings();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-teal-500 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h1 className="text-lg font-bold text-gray-900">Admin Panel</h1>
          </div>
          <button
            onClick={handleLogout}
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Sidebar Tabs */}
          <nav className="md:w-48 flex-shrink-0">
            <div className="flex md:flex-col gap-1 overflow-x-auto md:overflow-visible pb-2 md:pb-0">
              {TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => {
                    setActiveTab(tab.key);
                    setSaveMessage('');
                  }}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                    activeTab === tab.key
                      ? 'bg-teal-50 text-teal-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>
          </nav>

          {/* Content Area */}
          <div className="flex-1 min-w-0">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-5">
                {TABS.find((t) => t.key === activeTab)?.label}
              </h2>

              {renderTabContent()}

              {/* Save Bar */}
              <div className="mt-8 pt-5 border-t border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleSave}
                    disabled={saving || !hasChanges}
                    className="px-5 py-2 bg-teal-500 text-white text-sm font-semibold rounded-lg hover:bg-teal-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                  {hasChanges && (
                    <button
                      onClick={handleDiscard}
                      className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                    >
                      Discard
                    </button>
                  )}
                </div>
                {saveMessage && (
                  <p className={`text-sm ${saveMessage.includes('success') ? 'text-green-600' : 'text-red-500'}`}>
                    {saveMessage}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
