-- PARTICIPANT EMAIL: Run this in Supabase SQL Editor
-- Adds an optional email column so participants can be notified by email
-- when the organizer finalizes a "Find a Time" event.

ALTER TABLE participants
  ADD COLUMN IF NOT EXISTS email TEXT
  CHECK (email IS NULL OR char_length(email) <= 254);
