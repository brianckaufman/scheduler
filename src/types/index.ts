export interface Event {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  body: string | null;
  organizer_name: string | null;
  /** Where organizer notifications go. Behind a migration, so may be absent. */
  organizer_email?: string | null;
  location: string | null;
  duration_minutes: number;
  response_deadline: string | null;
  finalized_time: string | null;
  max_participants: number | null;
  min_responses: number | null;
  dates: string[];
  time_start: string;
  time_end: string;
  timezone: string;
  created_at: string;
  event_type: 'availability' | 'fixed';
  color?: string | null;
  hide_guest_list?: boolean;
  // Polished Pro (Phase 3) — semantic event type (seeds module defaults + tone).
  event_kind?: string | null;
  // Polished Pro (Phase 2) — per-event branding + module config.
  logo_url?: string | null;
  photo_url?: string | null;
  icon_bg?: string | null;
  icon_fg?: string | null;
  config?: import('@/lib/eventConfig').EventConfig | null;
  // All-day events — whole days instead of times-of-day (vacations, conferences).
  all_day?: boolean;
  // Inclusive end date ('yyyy-MM-dd') of a finalized all-day range. Null/absent
  // for a single-day all-day event (same day as finalized_time) or a timed event.
  finalized_end_date?: string | null;
  // Sequential-block mode (all-day events only) — require an unbroken run of at
  // least this many consecutive calendar days that works for everyone, for
  // trips/vacations. Null/absent = flexible "any overlapping days" behaviour.
  min_block_days?: number | null;
}

export type RsvpValue = 'yes' | 'maybe' | 'no';

export interface Participant {
  id: string;
  event_id: string;
  name: string;
  created_at: string;
  rsvp: RsvpValue | null;
  email?: string | null;
  guest_count?: number;
}

export interface AvailabilitySlot {
  id: string;
  event_id: string;
  participant_id: string;
  slot_start: string;
  created_at: string;
}
