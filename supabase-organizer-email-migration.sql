-- ORGANIZER EMAIL: Run this in Supabase SQL Editor
-- Adds an optional organizer email so the event creator can receive
-- notifications (e.g. when the minimum number of responses is reached).

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS organizer_email TEXT
  CHECK (organizer_email IS NULL OR char_length(organizer_email) <= 254);
