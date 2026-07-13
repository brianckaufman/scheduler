-- WeGather.You — All-day events (Find-a-Time + RSVP).
-- Run once in the Supabase SQL editor. Safe to re-run (uses IF NOT EXISTS).

-- Whole-day mode: participants/organizer work in days, not times-of-day.
ALTER TABLE events ADD COLUMN IF NOT EXISTS all_day BOOLEAN NOT NULL DEFAULT false;

-- Inclusive end date of a finalized all-day range (multi-day RSVP set at
-- creation, or a Find-a-Time range finalized later). finalized_time holds the
-- range start (midnight in the event's timezone, stored UTC-normalized).
-- NULL means "same day as finalized_time" for a single-day all-day event.
ALTER TABLE events ADD COLUMN IF NOT EXISTS finalized_end_date DATE;
