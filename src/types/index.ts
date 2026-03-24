export interface Event {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  body: string | null;
  organizer_name: string | null;
  location: string | null;
  duration_minutes: number;
  response_deadline: string | null;
  finalized_time: string | null;
  max_participants: number | null;
  dates: string[];
  time_start: string;
  time_end: string;
  timezone: string;
  created_at: string;
  event_type: 'availability' | 'fixed';
  cover_image_url: string | null;
}

export type RsvpValue = 'yes' | 'maybe' | 'no';

export interface Participant {
  id: string;
  event_id: string;
  name: string;
  created_at: string;
  rsvp: RsvpValue | null;
}

export interface AvailabilitySlot {
  id: string;
  event_id: string;
  participant_id: string;
  slot_start: string;
  created_at: string;
}
