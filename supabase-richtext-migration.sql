-- Rich Text Migration: Add body column (no character limit)
-- Run this in the Supabase SQL Editor
-- Safe to run on existing databases — uses IF NOT EXISTS / IF EXISTS guards.

-- Add the body column if it doesn't already exist (no char limit — HTML can be long)
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS body TEXT;

-- If the column was added previously with a 5000-char constraint, drop it
ALTER TABLE events
  DROP CONSTRAINT IF EXISTS events_body_check;
ALTER TABLE events
  DROP CONSTRAINT IF EXISTS events_body_length;
