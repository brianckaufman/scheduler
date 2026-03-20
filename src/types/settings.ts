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
    privacy_policy: `<h2>Privacy Policy</h2>
<p>This Privacy Policy describes how this Service collects, uses, and handles information when you use our group scheduling application. By using the Service, you agree to the practices described here.</p>

<h2>Information We Collect</h2>
<p>We collect only the minimum information necessary to provide the scheduling service:</p>
<ul>
<li><strong>Event information:</strong> Event names, descriptions, dates, times, and locations you provide when creating an event.</li>
<li><strong>Participant names:</strong> Names entered voluntarily by participants to identify themselves.</li>
<li><strong>Availability data:</strong> Time slot selections and RSVP responses submitted by participants.</li>
<li><strong>Device data:</strong> Basic browser and device information used for service functionality.</li>
</ul>

<h2>No Accounts Required</h2>
<p>This Service does not require you to create an account. We do not collect email addresses, passwords, or other account credentials. Participant identity is managed through your browser's local storage, which remains on your device.</p>

<h2>How We Use Your Information</h2>
<p>Information collected is used solely to provide scheduling functionality — displaying event details, recording availability, and showing results. We do not use your information for advertising, marketing, or profiling.</p>

<h2>Data Storage and Retention</h2>
<p>Event and availability data is stored in a secure database. Events and associated data may be removed after a period of inactivity. We do not guarantee the permanent storage of any event data.</p>

<h2>No Data Selling</h2>
<p>We do not sell, rent, trade, or otherwise transfer your information to third parties.</p>

<h2>Third-Party Services</h2>
<p>This Service uses third-party infrastructure providers (such as hosting and database services) to operate. These providers are subject to their own privacy policies.</p>

<h2>Children's Privacy</h2>
<p>This Service is not directed to children under 13. We do not knowingly collect information from children.</p>

<h2>Changes to This Policy</h2>
<p>We may update this Privacy Policy at any time. Continued use of the Service after changes constitutes acceptance of the updated policy.</p>`,

    terms_of_use: `<h2>Terms of Use</h2>
<p>By accessing or using this Service, you agree to be bound by these Terms of Use. If you do not agree, do not use the Service.</p>

<h2>Service Description</h2>
<p>This Service provides a free, no-account group scheduling tool. Users can create events, share links, and collect availability or RSVPs from participants. The Service is provided free of charge.</p>

<h2>Acceptable Use</h2>
<p>You agree to use this Service only for lawful purposes and in a manner that does not infringe the rights of others. You agree not to use the Service to transmit harmful, offensive, or illegal content.</p>

<h2>No Warranty</h2>
<p>THIS SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT ANY WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR SECURE.</p>

<h2>Limitation of Liability</h2>
<p>TO THE FULLEST EXTENT PERMITTED BY APPLICABLE LAW, THE OPERATOR OF THIS SERVICE SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING OUT OF OR RELATED TO YOUR USE OF, OR INABILITY TO USE, THIS SERVICE — INCLUDING BUT NOT LIMITED TO LOSS OF DATA, MISSED EVENTS, SCHEDULING ERRORS, OR BUSINESS INTERRUPTION — WHETHER BASED ON WARRANTY, CONTRACT, TORT, OR ANY OTHER LEGAL THEORY.</p>
<p>IN NO EVENT SHALL TOTAL LIABILITY EXCEED THE AMOUNT YOU PAID TO USE THIS SERVICE. AS THIS IS A FREE SERVICE, THAT AMOUNT IS ZERO.</p>

<h2>No Assumption of Liability</h2>
<p>The operator of this Service assumes no liability, past, present, or future, arising from your use of the Service. This includes but is not limited to scheduling outcomes, missed events, data loss, or any reliance placed on information provided through the Service. Use of this Service is entirely at your own risk.</p>

<h2>User Content</h2>
<p>You retain ownership of any content you submit. By submitting content, you grant us a limited license to store and display it for the purpose of providing the Service. You are solely responsible for the content you create and share through this Service.</p>

<h2>Event Data</h2>
<p>Events and associated data may be deleted after a period of inactivity. We do not guarantee the availability or permanence of any event data. You are responsible for maintaining your own records.</p>

<h2>Service Availability</h2>
<p>We reserve the right to modify, suspend, or discontinue the Service at any time without notice or liability. We may remove any content that violates these Terms.</p>

<h2>Indemnification</h2>
<p>You agree to indemnify and hold harmless the operator of this Service from any claims, damages, losses, or expenses arising out of your use of the Service or violation of these Terms.</p>

<h2>Governing Law</h2>
<p>These Terms shall be governed by applicable law. Any disputes arising under these Terms shall be resolved in the jurisdiction where the Service operator is located.</p>

<h2>Changes to These Terms</h2>
<p>We reserve the right to update these Terms at any time. Continued use of the Service after changes constitutes acceptance of the revised Terms.</p>`,

    cookie_policy: `<h2>Cookie Policy</h2>
<p>This Cookie Policy explains how this Service uses browser storage on your device.</p>

<h2>What We Use</h2>
<p>This Service uses browser <strong>local storage</strong> — not traditional cookies — to store session information on your device. This includes:</p>
<ul>
<li>Your name and participant ID for events you have joined</li>
<li>Organizer tokens for events you created</li>
<li>UI preferences such as dismissed prompts</li>
</ul>
<p>This data stays on your device and is only used to provide Service functionality during your session.</p>

<h2>What We Don't Use</h2>
<p>We do not use tracking cookies, advertising cookies, or third-party analytics cookies that follow you across other websites. We do not build behavioral profiles.</p>

<h2>Third-Party Services</h2>
<p>If analytics tools are configured by the site operator, those services may set their own cookies subject to their respective privacy policies.</p>

<h2>Managing Your Data</h2>
<p>You can clear local storage data at any time through your browser settings. Doing so will remove your session for any events you have joined.</p>`,

    show_privacy: true,
    show_terms: true,
    show_cookies: false,
  },
  copy: DEFAULT_COPY,
};
