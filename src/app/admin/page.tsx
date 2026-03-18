'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { SiteSettings, CopySettings } from '@/types/settings';
import { DEFAULT_SETTINGS, DEFAULT_COPY } from '@/types/settings';
import ImageUpload from '@/components/ImageUpload';

import type { ReactNode } from 'react';

type TabKey = 'seo' | 'branding' | 'copy' | 'monetization' | 'analytics' | 'social' | 'app';

const iconClass = 'w-4 h-4 flex-shrink-0';

const TAB_ICONS: Record<TabKey, ReactNode> = {
  seo: (
    <svg className={iconClass} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
    </svg>
  ),
  branding: (
    <svg className={iconClass} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.098 19.902a3.75 3.75 0 005.304 0l6.401-6.402M6.75 21A3.75 3.75 0 013 17.25V4.125C3 3.504 3.504 3 4.125 3h5.25c.621 0 1.125.504 1.125 1.125v4.072M6.75 21a3.75 3.75 0 003.75-3.75V8.197M6.75 21h13.125c.621 0 1.125-.504 1.125-1.125v-5.25c0-.621-.504-1.125-1.125-1.125h-4.072M10.5 8.197l2.88-2.88c.438-.439 1.15-.439 1.59 0l3.712 3.713c.44.44.44 1.152 0 1.59l-2.879 2.88M6.75 17.25h.008v.008H6.75v-.008z" />
    </svg>
  ),
  copy: (
    <svg className={iconClass} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 21l5.25-11.25L21 21m-9-3h7.5M3 5.621a48.474 48.474 0 016-.371m0 0c1.12 0 2.233.038 3.334.114M9 5.25V3m3.334 2.364C11.176 10.658 7.69 15.08 3 17.502m9.334-12.138c.896.061 1.785.147 2.666.257m-4.589 8.495a18.023 18.023 0 01-3.827-5.802" />
    </svg>
  ),
  monetization: (
    <svg className={iconClass} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
    </svg>
  ),
  analytics: (
    <svg className={iconClass} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
  ),
  social: (
    <svg className={iconClass} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
    </svg>
  ),
  app: (
    <svg className={iconClass} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
    </svg>
  ),
};

const TABS: { key: TabKey; label: string }[] = [
  { key: 'seo', label: 'SEO' },
  { key: 'branding', label: 'Branding' },
  { key: 'copy', label: 'Copy & Language' },
  { key: 'monetization', label: 'Monetization' },
  { key: 'analytics', label: 'Analytics' },
  { key: 'social', label: 'Social' },
  { key: 'app', label: 'App Settings' },
];

/* ── Copy group definitions for the Copy & Language tab ── */

interface CopyField {
  key: string;
  label: string;
  multiline?: boolean;
  variables?: string[];
}

interface CopyGroup {
  key: keyof CopySettings;
  label: string;
  fields: CopyField[];
}

const COPY_GROUPS: CopyGroup[] = [
  {
    key: 'home',
    label: 'Home Page',
    fields: [
      { key: 'title', label: 'Title' },
      { key: 'subtitle', label: 'Subtitle', multiline: true },
      { key: 'step1_title', label: 'Step 1 Title' },
      { key: 'step1_desc', label: 'Step 1 Description' },
      { key: 'step2_title', label: 'Step 2 Title' },
      { key: 'step2_desc', label: 'Step 2 Description' },
      { key: 'step3_title', label: 'Step 3 Title' },
      { key: 'step3_desc', label: 'Step 3 Description' },
      { key: 'footer', label: 'Footer' },
    ],
  },
  {
    key: 'form',
    label: 'Event Form',
    fields: [
      { key: 'event_label', label: 'Event Label' },
      { key: 'event_placeholder', label: 'Event Placeholder' },
      { key: 'description_label', label: 'Description Label' },
      { key: 'description_placeholder', label: 'Description Placeholder' },
      { key: 'name_label', label: 'Name Label' },
      { key: 'name_placeholder', label: 'Name Placeholder' },
      { key: 'location_label', label: 'Location Label' },
      { key: 'location_placeholder', label: 'Location Placeholder' },
      { key: 'dates_label', label: 'Dates Label' },
      { key: 'earliest_label', label: 'Earliest Time Label' },
      { key: 'latest_label', label: 'Latest Time Label' },
      { key: 'duration_label', label: 'Duration Label' },
      { key: 'deadline_label', label: 'Deadline Label' },
      { key: 'submit', label: 'Submit Button' },
      { key: 'submitting', label: 'Submitting Text' },
      { key: 'error_time', label: 'Time Error' },
    ],
  },
  {
    key: 'onboarding',
    label: 'Onboarding',
    fields: [
      { key: 'name_label', label: 'Name Label' },
      { key: 'name_placeholder', label: 'Name Placeholder' },
      { key: 'next', label: 'Next Button' },
      { key: 'back', label: 'Back Button' },
      { key: 'greeting', label: 'Greeting', variables: ['name'] },
      { key: 'greeting_subtitle', label: 'Greeting Subtitle' },
      { key: 'step1_title', label: 'Step 1 Title' },
      { key: 'step1_desc', label: 'Step 1 Description', multiline: true },
      { key: 'step2_title', label: 'Step 2 Title' },
      { key: 'step2_desc', label: 'Step 2 Description', multiline: true },
      { key: 'step3_title', label: 'Step 3 Title', variables: ['organizer'] },
      { key: 'step3_desc', label: 'Step 3 Description', multiline: true },
      { key: 'submit', label: 'Submit Button' },
      { key: 'submitting', label: 'Submitting Text' },
      { key: 'footer', label: 'Footer' },
      { key: 'error_name', label: 'Name Error' },
    ],
  },
  {
    key: 'event',
    label: 'Event Page',
    fields: [
      { key: 'organized_by', label: 'Organized By', variables: ['name'] },
      { key: 'duration_needed', label: 'Duration Needed', variables: ['duration'] },
      { key: 'deadline_passed', label: 'Deadline Passed' },
      { key: 'respond_by', label: 'Respond By', variables: ['date', 'relative'] },
      { key: 'tap_instruction', label: 'Tap Instruction' },
      { key: 'all_set_title', label: 'All Set Title' },
      { key: 'all_set_desc', label: 'All Set Description', multiline: true, variables: ['count'] },
      { key: 'cta_prompt', label: 'CTA Prompt' },
      { key: 'cta_button', label: 'CTA Button' },
      { key: 'cta_footer', label: 'CTA Footer' },
    ],
  },
  {
    key: 'grid',
    label: 'Time Grid',
    fields: [
      { key: 'waiting', label: 'Waiting Message', multiline: true },
      { key: 'no_overlap', label: 'No Overlap Message', multiline: true },
      { key: 'overlap_found', label: 'Overlap Found Message' },
      { key: 'pick_time', label: 'Pick Time Button' },
      { key: 'waiting_organizer', label: 'Waiting for Organizer', variables: ['name'] },
      { key: 'best_times', label: 'Best Times Header' },
      { key: 'timezone_label', label: 'Timezone Label', variables: ['timezone'] },
      { key: 'participants_label', label: 'Participants Label', variables: ['count'] },
      { key: 'show_less', label: 'Show Less' },
      { key: 'show_all', label: 'Show All' },
      { key: 'you_suffix', label: 'You Suffix' },
      { key: 'legend_all', label: 'Legend All' },
      { key: 'legend_heat', label: 'Legend Heat' },
      { key: 'clear', label: 'Clear Button' },
      { key: 'all', label: 'All Button' },
    ],
  },
  {
    key: 'share',
    label: 'Share',
    fields: [
      { key: 'copy_link', label: 'Copy Link Button' },
      { key: 'copied', label: 'Copied Text' },
      { key: 'share', label: 'Share Button' },
      { key: 'share_prompt', label: 'Share Prompt', multiline: true },
      { key: 'share_text', label: 'Share Text', multiline: true, variables: ['event'] },
    ],
  },
  {
    key: 'notifications',
    label: 'Notifications',
    fields: [
      { key: 'title', label: 'Title' },
      { key: 'description', label: 'Description', multiline: true, variables: ['name'] },
      { key: 'enable', label: 'Enable Button' },
      { key: 'dismiss', label: 'Dismiss Button' },
    ],
  },
  {
    key: 'celebration',
    label: 'Celebration & Bookmark',
    fields: [
      { key: 'bookmark_title', label: 'Bookmark Title' },
      { key: 'bookmark_desc', label: 'Bookmark Description', multiline: true },
      { key: 'bookmark_shortcut_mac', label: 'Bookmark Shortcut (Mac)' },
      { key: 'bookmark_shortcut_win', label: 'Bookmark Shortcut (Windows)' },
      { key: 'bookmark_mobile', label: 'Bookmark Instruction (Mobile)' },
      { key: 'bookmark_dismiss', label: 'Bookmark Dismiss Button' },
    ],
  },
  // Note: celebration.time_saved_quips use {{texts}} and {{seconds}} but are managed as an array, not individual fields
  {
    key: 'returning',
    label: 'Returning Users',
    fields: [
      { key: 'welcome_back', label: 'Welcome Back Title' },
      { key: 'your_events', label: 'Your Events Label' },
      { key: 'new_event', label: 'New Event Link' },
    ],
  },
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
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['home']));

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/settings');
      if (res.status === 401) {
        router.push('/admin/login');
        return;
      }
      if (res.ok) {
        const data = await res.json();
        const s = data.settings ?? data;
        setSettings(s);
        setOriginalSettings(s);
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
    value: string | number | boolean
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

  const updateCopy = (
    group: keyof CopySettings,
    field: string,
    value: string
  ) => {
    setSettings((prev) => ({
      ...prev,
      copy: {
        ...prev.copy,
        [group]: {
          ...prev.copy[group],
          [field]: value,
        },
      },
    }));
    setHasChanges(true);
    setSaveMessage('');
  };

  const toggleGroup = (groupKey: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupKey)) {
        next.delete(groupKey);
      } else {
        next.add(groupKey);
      }
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveMessage('');

    try {
      // Only send the active tab's section to avoid overwriting other sections
      const sectionUpdate = activeTab === 'copy'
        ? { copy: settings.copy }
        : { [activeTab]: settings[activeTab] };

      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: sectionUpdate }),
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

  // Auto-save a specific section+field after image upload
  // This persists immediately so the user doesn't need to click "Save Changes"
  const autoSaveImageField = useCallback(async (
    section: keyof SiteSettings,
    field: string,
    url: string
  ) => {
    try {
      const sectionUpdate = {
        [section]: {
          ...settings[section],
          [field]: url,
        },
      };
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: sectionUpdate }),
      });

      if (res.ok) {
        const data = await res.json();
        const s = data.settings ?? data;
        setOriginalSettings(s);
        setSettings(s);
        setHasChanges(false);
        setSaveMessage('Image saved');
        setTimeout(() => setSaveMessage(''), 3000);
      }
    } catch {
      setSaveMessage('Image uploaded but failed to save settings');
    }
  }, [settings]);

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
        <label className={labelClass}>Site URL</label>
        <input
          className={inputClass}
          value={settings.seo.site_url || ''}
          onChange={(e) => updateSection('seo', 'site_url', e.target.value)}
          placeholder="https://yourdomain.com"
        />
        <p className={helpClass}>Required for og:url, canonical links, and rich social previews. Include https://</p>
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
      <ImageUpload
        value={settings.seo.og_image}
        onChange={(url) => updateSection('seo', 'og_image', url)}
        onUploadComplete={(url) => autoSaveImageField('seo', 'og_image', url)}
        folder="og"
        label="OG Image"
        help="Used as the preview image when sharing links on social media"
        aspectHint="1200 x 630px recommended (PNG, JPG, or WebP)"
      />
      <ImageUpload
        value={settings.seo.favicon}
        onChange={(url) => updateSection('seo', 'favicon', url)}
        onUploadComplete={(url) => autoSaveImageField('seo', 'favicon', url)}
        folder="favicon"
        label="Favicon"
        help="The small icon shown in browser tabs. Refresh the page after uploading to see changes."
        accept="image/png,image/x-icon,image/vnd.microsoft.icon,image/svg+xml"
        aspectHint="32 x 32px or 64 x 64px (ICO, PNG, or SVG)"
      />
      <div>
        <label className={labelClass}>Facebook App ID</label>
        <input
          className={inputClass}
          value={settings.seo.fb_app_id || ''}
          onChange={(e) => updateSection('seo', 'fb_app_id', e.target.value)}
          placeholder="123456789012345"
        />
        <p className={helpClass}>Optional. Required for Facebook Insights and some rich preview features. Get one at developers.facebook.com</p>
      </div>
    </div>
  );

  const renderBranding = () => (
    <div className="space-y-5">
      <ImageUpload
        value={settings.branding.logo_url}
        onChange={(url) => updateSection('branding', 'logo_url', url)}
        onUploadComplete={(url) => autoSaveImageField('branding', 'logo_url', url)}
        folder="logo"
        label="Logo"
        help="Displayed in the app header and shared links"
        aspectHint="SVG or PNG recommended (transparent background)"
      />

      {/* Logo display options — only shown when a logo is uploaded */}
      {settings.branding.logo_url && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Logo Display Options</p>

          <div>
            <label className={labelClass}>Logo Height (px)</label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={20}
                max={120}
                step={4}
                value={settings.branding.logo_height || 40}
                onChange={(e) => updateSection('branding', 'logo_height', Number(e.target.value))}
                className="flex-1 accent-teal-500"
              />
              <span className="text-sm text-gray-600 w-12 text-right">{settings.branding.logo_height || 40}px</span>
            </div>
            <p className={helpClass}>Controls the logo size on the homepage. Event pages use 70% of this value.</p>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.branding.hide_home_title || false}
                onChange={(e) => updateSection('branding', 'hide_home_title', e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-teal-500 focus:ring-teal-400"
              />
              <span className="text-sm text-gray-700">Hide homepage title</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.branding.hide_home_subtitle || false}
                onChange={(e) => updateSection('branding', 'hide_home_subtitle', e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-teal-500 focus:ring-teal-400"
              />
              <span className="text-sm text-gray-700">Hide homepage subtitle</span>
            </label>
            <p className={helpClass}>When checked, the title/subtitle text is hidden so only the logo shows.</p>
          </div>
        </div>
      )}

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

  const renderCopy = () => {
    const defaultCopy = DEFAULT_COPY;

    return (
      <div className="space-y-3">
        <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 mb-4">
          <div className="flex items-start gap-2">
            <svg className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
            </svg>
            <p className="text-xs text-gray-500">
              Use <code className="bg-white px-1.5 py-0.5 rounded border border-gray-200 font-mono text-[11px]">{'{{placeholder}}'}</code> syntax for dynamic values.
              For example, <code className="bg-white px-1.5 py-0.5 rounded border border-gray-200 font-mono text-[11px]">{'{{name}}'}</code> will be
              replaced with the actual participant or organizer name at render time.
            </p>
          </div>
        </div>

        {COPY_GROUPS.map((group) => {
          const isExpanded = expandedGroups.has(group.key);
          const groupDefaults = defaultCopy[group.key] as Record<string, string>;
          const groupValues = (settings.copy[group.key] || {}) as Record<string, string>;

          return (
            <div key={group.key} className="border border-gray-200 rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => toggleGroup(group.key)}
                className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
              >
                <span className="text-sm font-medium text-gray-700">{group.label}</span>
                <svg
                  className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
              </button>

              {isExpanded && (
                <div className="p-4 space-y-4">
                  {group.fields.map((field) => (
                    <div key={field.key}>
                      <label className={labelClass}>{field.label}</label>
                      {field.multiline ? (
                        <textarea
                          className={inputClass + ' resize-none'}
                          rows={2}
                          value={groupValues[field.key] ?? ''}
                          onChange={(e) => updateCopy(group.key, field.key, e.target.value)}
                          placeholder={groupDefaults[field.key] || ''}
                        />
                      ) : (
                        <input
                          className={inputClass}
                          value={groupValues[field.key] ?? ''}
                          onChange={(e) => updateCopy(group.key, field.key, e.target.value)}
                          placeholder={groupDefaults[field.key] || ''}
                        />
                      )}
                      {field.variables && field.variables.length > 0 && (
                        <div className="flex items-center gap-1.5 mt-1.5">
                          <span className="text-[10px] text-gray-400 uppercase tracking-wide">Variables:</span>
                          {field.variables.map((v) => (
                            <button
                              key={v}
                              type="button"
                              onClick={() => {
                                const current = groupValues[field.key] ?? '';
                                updateCopy(group.key, field.key, current + `{{${v}}}`);
                              }}
                              className="px-1.5 py-0.5 bg-teal-50 text-teal-700 text-[11px] font-mono rounded border border-teal-200 hover:bg-teal-100 transition-colors cursor-pointer"
                              title={`Click to insert {{${v}}}`}
                            >
                              {`{{${v}}}`}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

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
        <p className={helpClass}>Leave empty to hide all donation prompts throughout the app</p>
      </div>
      <div>
        <label className={labelClass}>Donation Button Text</label>
        <input
          className={inputClass}
          value={settings.monetization.donation_cta}
          onChange={(e) => updateSection('monetization', 'donation_cta', e.target.value)}
          placeholder="Buy me a coffee ☕"
        />
        <p className={helpClass}>Text shown on the donation button</p>
      </div>
      <div>
        <label className={labelClass}>Donation Message</label>
        <input
          className={inputClass}
          value={settings.monetization.donation_message || ''}
          onChange={(e) => updateSection('monetization', 'donation_message', e.target.value)}
          placeholder="Love this app? Help keep it free!"
        />
        <p className={helpClass}>Short message shown above the donation button</p>
      </div>

      {settings.monetization.buymeacoffee_url && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Visibility</p>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.monetization.show_on_home !== false}
              onChange={(e) => updateSection('monetization', 'show_on_home', e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-teal-500 focus:ring-teal-400"
            />
            <span className="text-sm text-gray-700">Show on homepage footer</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.monetization.show_on_event !== false}
              onChange={(e) => updateSection('monetization', 'show_on_event', e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-teal-500 focus:ring-teal-400"
            />
            <span className="text-sm text-gray-700">Show on event page footer</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.monetization.show_on_success !== false}
              onChange={(e) => updateSection('monetization', 'show_on_success', e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-teal-500 focus:ring-teal-400"
            />
            <span className="text-sm text-gray-700">Show after availability submitted (&quot;all set&quot; moment)</span>
          </label>
          <p className={helpClass}>Control where donation prompts appear. The &quot;all set&quot; moment is the highest-conversion placement — users just got value and feel grateful.</p>
        </div>
      )}
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
          <option value={180}>3 hours</option>
          <option value={240}>4 hours</option>
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
      case 'copy': return renderCopy();
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
            <h1 className="text-lg font-bold text-gray-900">
              Admin Panel
              {settings.seo.site_name && settings.seo.site_name !== 'Scheduler' && (
                <span className="text-gray-400 font-normal text-sm ml-2">| {settings.seo.site_name}</span>
              )}
            </h1>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
            </svg>
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
                  {TAB_ICONS[tab.key]}
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
