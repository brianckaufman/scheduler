export interface SiteSettings {
  seo: {
    og_title: string;
    og_description: string;
    og_image: string;
    favicon: string;
    site_name: string;
  };
  branding: {
    logo_url: string;
    accent_color: string;
    footer_text: string;
  };
  monetization: {
    buymeacoffee_url: string;
    donation_cta: string;
  };
  analytics: {
    ga_id: string;
    gtm_id: string;
    custom_head_scripts: string;
  };
  social: {
    twitter_url: string;
    instagram_url: string;
    tiktok_url: string;
    share_default_text: string;
  };
  app: {
    default_duration: number;
    max_participants: number;
    rate_limit_events_per_hour: number;
  };
}

export const DEFAULT_SETTINGS: SiteSettings = {
  seo: {
    og_title: 'Scheduler',
    og_description: 'Find a time that works for everyone. No accounts needed.',
    og_image: '',
    favicon: '/favicon.ico',
    site_name: 'Scheduler',
  },
  branding: {
    logo_url: '',
    accent_color: '#0d9488',
    footer_text: 'Free forever. No sign-up. No spam.',
  },
  monetization: {
    buymeacoffee_url: '',
    donation_cta: 'Buy me a coffee',
  },
  analytics: {
    ga_id: '',
    gtm_id: '',
    custom_head_scripts: '',
  },
  social: {
    twitter_url: '',
    instagram_url: '',
    tiktok_url: '',
    share_default_text: 'Help me find a time that works! Fill in your availability:',
  },
  app: {
    default_duration: 60,
    max_participants: 100,
    rate_limit_events_per_hour: 10,
  },
};
