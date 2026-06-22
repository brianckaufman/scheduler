-- RSVP CAPACITY + GUESTS
-- max_participants already exists on `events` and is reused as the RSVP
-- attendee cap. This adds the per-RSVP additional-guest count.
-- Run in the Supabase SQL Editor.

ALTER TABLE participants
  ADD COLUMN IF NOT EXISTS guest_count INTEGER NOT NULL DEFAULT 0
  CHECK (guest_count >= 0 AND guest_count <= 20);
