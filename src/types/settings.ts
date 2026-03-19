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
    // RSVP event onboarding
    rsvp_greeting_subtitle: string;
    rsvp_step1_title: string;
    rsvp_step1_desc: string;
    rsvp_step2_title: string;
    rsvp_step2_desc: string;
    rsvp_step3_title: string;
    rsvp_step3_desc: string;
    rsvp_submit: string;
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
  celebration: {
    time_saved_quips: string[];
    bookmark_title: string;
    bookmark_desc: string;
    bookmark_shortcut_mac: string;
    bookmark_shortcut_win: string;
    bookmark_mobile: string;
    bookmark_dismiss: string;
  };
  returning: {
    welcome_back: string;
    your_events: string;
    new_event: string;
  };
  rsvp: {
    heading: string;
    going: string;
    maybe: string;
    cant: string;
    change: string;
    attendees_title: string;
    no_responses: string;
    going_label: string;
    maybe_label: string;
    cant_label: string;
    pending_label: string;
  };
}

// ── Site Settings ───────────────────────────────────────────────

export interface SiteSettings {
  seo: {
    og_title: string;
    og_description: string;
    og_image: string;
    favicon: string;
    apple_icon: string;
    android_icon: string;
    site_name: string;
    site_url: string;
    fb_app_id: string;
  };
  branding: {
    logo_url: string;
    logo_height: number;
    hide_home_title: boolean;
    hide_home_subtitle: boolean;
    accent_color: string;
    footer_text: string;
  };
  monetization: {
    buymeacoffee_url: string;
    donation_cta: string;
    donation_message: string;
    show_on_home: boolean;
    show_on_event: boolean;
    show_on_success: boolean;
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
    enable_fixed_events: boolean;
  };
  legal: {
    privacy_policy: string;
    terms_of_use: string;
    cookie_policy: string;
    show_privacy: boolean;
    show_terms: boolean;
    show_cookies: boolean;
  };
  copy: CopySettings;
}

// ── Defaults ────────────────────────────────────────────────────

export const DEFAULT_COPY: CopySettings = {
  home: {
    title: 'Scheduler',
    subtitle: 'Stop texting "does Tuesday work?" to 14 people.',
    step1_title: 'Create an event',
    step1_desc: 'Takes about 30 seconds',
    step2_title: 'Share the link',
    step2_desc: 'Watch people actually respond',
    step3_title: 'Pick the best time',
    step3_desc: 'Zero back-and-forth needed',
    footer: 'Free forever. Zero accounts. Your group chat will thank you.',
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
    submitting: 'Working on it...',
    error_time: 'End time must be after start time',
  },
  onboarding: {
    name_label: 'Your name',
    name_placeholder: 'Enter your name',
    next: "Let's go",
    back: 'Back',
    greeting: "Hey {{name}}, this'll be quick",
    greeting_subtitle: 'Faster than reading a group text',
    step1_title: "Tap the times you're free",
    step1_desc: 'Each cell is a time slot. Tap to select, tap again to undo. Easy.',
    step2_title: 'It saves automatically',
    step2_desc: "No submit button. We respect your time more than that.",
    step3_title: '{{organizer}} picks the final time',
    step3_desc: "Once everyone responds, the best time gets picked. You'll know.",
    submit: "Let's Pick Times",
    submitting: 'One sec...',
    footer: 'Free. No account. No nonsense.',
    error_name: 'Please enter a valid name.',
    rsvp_greeting_subtitle: "Just let us know if you can make it. Takes two seconds.",
    rsvp_step1_title: 'RSVP with a single tap',
    rsvp_step1_desc: "Going, Maybe, or Can't make it. Done in two seconds.",
    rsvp_step2_title: 'See who else is coming',
    rsvp_step2_desc: 'Watch the guest list fill up in real time.',
    rsvp_step3_title: 'Change your mind? No problem',
    rsvp_step3_desc: 'Update your RSVP anytime before the event.',
    rsvp_submit: "See the Event",
  },
  event: {
    organized_by: 'Organized by {{name}}',
    duration_needed: '{{duration}} needed',
    deadline_passed: 'Response deadline has passed',
    respond_by: 'Respond by {{date}} ({{relative}})',
    tap_instruction: "Tap the times you're available",
    all_set_title: 'Done. That was easy.',
    all_set_desc: 'Change anytime by tapping the grid above.',
    cta_prompt: 'Impressed? (You should be.)',
    cta_button: 'Schedule your own event',
    cta_footer: 'Still free. Still no sign-up. Still magic.',
  },
  grid: {
    waiting: 'Waiting for more people to join...',
    no_overlap: "No perfect overlap yet. But we're getting there.",
    overlap_found: 'We found times that work for everyone!',
    pick_time: 'Pick a Time',
    waiting_organizer: 'Waiting for {{name}} to make the call',
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
    share_prompt: 'Send this before someone starts a group text about it',
    share_text: 'When can you meet for "{{event}}"? Tap your availability (takes 10 seconds):',
  },
  notifications: {
    title: 'Get notified when a time is picked',
    description: "We'll ping you when {{name}} locks in the time. No spam, ever.",
    enable: 'Notify me',
    dismiss: 'No thanks',
  },
  celebration: {
    time_saved_quips: [
      "That's roughly {{texts}} texts you just avoided.",
      'You just saved everyone a {{texts}}-message group chat.',
      'Somewhere, a group text thread just breathed a sigh of relief.',
      "{{texts}} back-and-forth messages? Not today.",
      "Scheduling in under a minute. You're basically a productivity influencer now.",
      'That was faster than finding a GIF to send in the group chat.',
      "Your future self just high-fived you.",
      "Look at you, being a functional adult.",
      "{{texts}} potential 'does this work?' texts, eliminated.",
      "You just got {{seconds}} seconds of your life back. You're welcome.",
    ],
    bookmark_title: 'Bookmark this page',
    bookmark_desc: "You'll want to come back to check responses and pick the final time.",
    bookmark_shortcut_mac: 'Press Cmd+D to bookmark',
    bookmark_shortcut_win: 'Press Ctrl+D to bookmark',
    bookmark_mobile: 'Tap Share, then "Add to Home Screen"',
    bookmark_dismiss: 'Got it',
  },
  returning: {
    welcome_back: 'Welcome back',
    your_events: 'Your events',
    new_event: 'New event',
  },
  rsvp: {
    heading: 'Can you make it?',
    going: 'Going',
    maybe: 'Maybe',
    cant: "Can't make it",
    change: 'Change response',
    attendees_title: "Who's coming",
    no_responses: 'No responses yet',
    going_label: 'Going',
    maybe_label: 'Maybe',
    cant_label: "Can't make it",
    pending_label: 'Awaiting response',
  },
};

export const DEFAULT_SETTINGS: SiteSettings = {
  seo: {
    og_title: 'Scheduler',
    og_description: 'Stop texting "does Tuesday work?" to 14 people. Free group scheduling, no sign-up required.',
    og_image: '',
    favicon: '',
    apple_icon: '',
    android_icon: '',
    site_name: 'Scheduler',
    site_url: '',
    fb_app_id: '',
  },
  branding: {
    logo_url: '',
    logo_height: 40,
    hide_home_title: false,
    hide_home_subtitle: false,
    accent_color: '#0d9488',
    footer_text: 'Free forever. Zero accounts. Your group chat will thank you.',
  },
  monetization: {
    buymeacoffee_url: '',
    donation_cta: 'Buy me a coffee ☕',
    donation_message: 'Love this app? Help keep it free!',
    show_on_home: true,
    show_on_event: true,
    show_on_success: true,
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
    share_default_text: 'Help me find a time that works! Fill in your availability (takes 10 seconds):',
  },
  app: {
    default_duration: 60,
    max_participants: 100,
    rate_limit_events_per_hour: 10,
    enable_fixed_events: true,
  },
  legal: {
    privacy_policy: '',
    terms_of_use: '',
    cookie_policy: '',
    show_privacy: true,
    show_terms: true,
    show_cookies: false,
  },
  copy: DEFAULT_COPY,
};
