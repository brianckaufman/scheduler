// ── Copy / Language ──────────────────────────────────────────────
// Use {{variable}} for dynamic placeholders in copy strings.
// Components replace these at render time.

export interface CopySettings {
  home: {
    title: string;
    subtitle: string;
    step1_title: string;
    step1_desc: string;
    step2_title: string;
    step2_desc: string;
    step3_title: string;
    step3_desc: string;
    footer: string;
  };
  form: {
    event_label: string;
    event_placeholder: string;
    description_label: string;
    description_placeholder: string;
    name_label: string;
    name_placeholder: string;
    location_label: string;
    location_placeholder: string;
    dates_label: string;
    earliest_label: string;
    latest_label: string;
    duration_label: string;
    deadline_label: string;
    submit: string;
    submitting: string;
    error_time: string;
  };
  onboarding: {
    name_label: string;
    name_placeholder: string;
    next: string;
    back: string;
    greeting: string;
    greeting_subtitle: string;
    step1_title: string;
    step1_desc: string;
    step2_title: string;
    step2_desc: string;
    step3_title: string;
    step3_desc: string;
    submit: string;
    submitting: string;
    footer: string;
    error_name: string;
  };
  event: {
    organized_by: string;
    duration_needed: string;
    deadline_passed: string;
    respond_by: string;
    tap_instruction: string;
    all_set_title: string;
    all_set_desc: string;
    cta_prompt: string;
    cta_button: string;
    cta_footer: string;
  };
  grid: {
    waiting: string;
    no_overlap: string;
    overlap_found: string;
    pick_time: string;
    waiting_organizer: string;
    best_times: string;
    timezone_label: string;
    participants_label: string;
    show_less: string;
    show_all: string;
    you_suffix: string;
    legend_all: string;
    legend_heat: string;
    clear: string;
    all: string;
  };
  share: {
    copy_link: string;
    copied: string;
    share: string;
    share_prompt: string;
    share_text: string;
  };
  notifications: {
    title: string;
    description: string;
    enable: string;
    dismiss: string;
  };
}

// ── Site Settings ───────────────────────────────────────────────

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
  copy: CopySettings;
}

// ── Defaults ────────────────────────────────────────────────────

export const DEFAULT_COPY: CopySettings = {
  home: {
    title: 'Scheduler',
    subtitle: 'Find a time that works for everyone. No accounts needed.',
    step1_title: 'Create an event',
    step1_desc: 'Pick dates & times',
    step2_title: 'Share the link',
    step2_desc: 'Everyone taps availability',
    step3_title: 'Pick the best time',
    step3_desc: 'See overlap instantly',
    footer: 'Free forever. No sign-up. No spam.',
  },
  form: {
    event_label: "What's the event?",
    event_placeholder: 'Team dinner, study group, game night...',
    description_label: 'Description (optional)',
    description_placeholder: 'Quick meeting to discuss Q2 goals...',
    name_label: 'Your name',
    name_placeholder: 'Your name',
    location_label: 'Location (optional)',
    location_placeholder: 'Zoom, office, cafe...',
    dates_label: 'Which days could work?',
    earliest_label: 'Earliest time',
    latest_label: 'Latest time',
    duration_label: 'How long do you need?',
    deadline_label: 'Respond by (optional)',
    submit: 'Create Event',
    submitting: 'Creating...',
    error_time: 'End time must be after start time',
  },
  onboarding: {
    name_label: 'Your name',
    name_placeholder: 'Enter your name',
    next: 'Next',
    back: 'Back',
    greeting: "Hi {{name}}, here's how it works",
    greeting_subtitle: 'It only takes a moment',
    step1_title: "Tap the times you're free",
    step1_desc: 'Each cell is a 30-minute slot. Tap to select, tap again to deselect.',
    step2_title: 'Your picks save automatically',
    step2_desc: "No submit button needed. Just tap and you're done.",
    step3_title: '{{organizer}} picks the final time',
    step3_desc: 'Once everyone responds, the best time will be chosen.',
    submit: 'Pick Your Times',
    submitting: 'Getting ready...',
    footer: 'Powered by Scheduler. Free, no account needed.',
    error_name: 'Please enter a valid name.',
  },
  event: {
    organized_by: 'Organized by {{name}}',
    duration_needed: '{{duration}} needed',
    deadline_passed: 'Response deadline has passed',
    respond_by: 'Respond by {{date}} ({{relative}})',
    tap_instruction: "Tap the times you're available",
    all_set_title: "You're all set!",
    all_set_desc: '{{count}} time(s) selected. You can change your availability anytime by tapping the grid above.',
    cta_prompt: 'Need to schedule your own event?',
    cta_button: 'Create your own for free',
    cta_footer: 'No account needed',
  },
  grid: {
    waiting: 'Waiting for more participants to join...',
    no_overlap: 'No times work for everyone yet. Keep adding your availability!',
    overlap_found: 'Times found where everyone can meet!',
    pick_time: 'Pick a Time',
    waiting_organizer: 'Waiting for {{name}} to pick a time',
    best_times: 'Best Times & Overlap',
    timezone_label: 'Times shown in {{timezone}}',
    participants_label: 'Participants ({{count}})',
    show_less: 'Show less',
    show_all: 'Show all',
    you_suffix: '(you)',
    legend_all: 'Everyone can meet',
    legend_heat: 'More = darker',
    clear: 'Clear',
    all: 'All',
  },
  share: {
    copy_link: 'Copy Link',
    copied: 'Copied!',
    share: 'Share',
    share_prompt: 'Share this link so others can pick their availability',
    share_text: 'When can you meet for "{{event}}"? Tap your availability:',
  },
  notifications: {
    title: 'Get notified when a time is picked',
    description: "We'll send you a notification when {{name}} finalizes the time.",
    enable: 'Enable',
    dismiss: 'No thanks',
  },
};

export const DEFAULT_SETTINGS: SiteSettings = {
  seo: {
    og_title: 'Scheduler',
    og_description: 'Find a time that works for everyone. No accounts needed.',
    og_image: '',
    favicon: '',
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
  copy: DEFAULT_COPY,
};
