-- Location field migration
-- Removes the 100-char limit on the location column so it can hold
-- "Display Name@@https://maps.google.com/..." or virtual meeting URLs.
-- Run in the Supabase SQL Editor. Safe to run multiple times.

ALTER TABLE events
  DROP CONSTRAINT IF EXISTS events_location_check;

ALTER TABLE events
  ADD CONSTRAINT events_location_check
  CHECK (location IS NULL OR char_length(location) <= 600);
