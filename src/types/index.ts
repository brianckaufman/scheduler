export interface Event {
  id: string;
  slug: string;
  name: string;
  description: string | null;
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
}

export interface Participant {
  id: string;
  event_id: string;
  name: string;
  created_at: string;
}

export interface AvailabilitySlot {
  id: string;
  event_id: string;
  participant_id: string;
  slot_start: string;
  created_at: string;
}
