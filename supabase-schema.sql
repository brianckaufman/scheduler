-- Run this in the Supabase SQL Editor to set up the database

-- Events table
CREATE TABLE events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL CHECK (char_length(name) <= 100),
  description TEXT CHECK (description IS NULL OR char_length(description) <= 500),
  organizer_name TEXT CHECK (organizer_name IS NULL OR char_length(organizer_name) <= 50),
  location TEXT CHECK (location IS NULL OR char_length(location) <= 100),
  duration_minutes INTEGER DEFAULT 30 CHECK (duration_minutes IN (10, 15, 30, 45, 60, 90, 120, 180, 240)),
  response_deadline TIMESTAMPTZ,
  finalized_time TIMESTAMPTZ,
  organizer_token TEXT NOT NULL,
  dates DATE[] NOT NULL,
  time_start TIME NOT NULL,
  time_end TIME NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'America/New_York',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Participants table
CREATE TABLE participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL CHECK (char_length(name) <= 50),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Availability slots table
CREATE TABLE availability_slots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  participant_id UUID REFERENCES participants(id) ON DELETE CASCADE NOT NULL,
  slot_start TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(participant_id, slot_start)
);

-- Indexes
CREATE INDEX idx_availability_event ON availability_slots(event_id);
CREATE INDEX idx_availability_participant ON availability_slots(participant_id);
CREATE INDEX idx_events_slug ON events(slug);

-- Enable real-time (with full replica identity so DELETE events include row data)
ALTER PUBLICATION supabase_realtime ADD TABLE availability_slots;
ALTER PUBLICATION supabase_realtime ADD TABLE participants;
ALTER TABLE participants REPLICA IDENTITY FULL;
ALTER TABLE availability_slots REPLICA IDENTITY FULL;

-- Row Level Security
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_slots ENABLE ROW LEVEL SECURITY;

-- Events: anyone can read; insert/update go through server API routes
CREATE POLICY "events_select" ON events FOR SELECT USING (true);
CREATE POLICY "events_insert" ON events FOR INSERT WITH CHECK (true);
CREATE POLICY "events_update" ON events FOR UPDATE USING (true);

-- Participants: anyone can read and join, delete goes through API (organizer only)
CREATE POLICY "participants_select" ON participants FOR SELECT USING (true);
CREATE POLICY "participants_insert" ON participants FOR INSERT WITH CHECK (true);
CREATE POLICY "participants_delete" ON participants FOR DELETE USING (true);

-- Availability slots: anyone can read, insert, delete their own
CREATE POLICY "slots_select" ON availability_slots FOR SELECT USING (true);
CREATE POLICY "slots_insert" ON availability_slots FOR INSERT WITH CHECK (true);
CREATE POLICY "slots_delete" ON availability_slots FOR DELETE USING (true);

-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: Fixed-time events + RSVP
-- Run in Supabase SQL Editor on existing databases.
-- Safe to run on fresh databases too (IF NOT EXISTS guards).
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Add event_type column to events (defaults to 'availability' for existing rows)
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS event_type TEXT NOT NULL DEFAULT 'availability'
  CHECK (event_type IN ('availability', 'fixed'));

-- 2. Add rsvp column to participants (NULL = no response yet)
ALTER TABLE participants
  ADD COLUMN IF NOT EXISTS rsvp TEXT
  CHECK (rsvp IS NULL OR rsvp IN ('yes', 'maybe', 'no'));

-- 3. Allow UPDATE on participants (needed for RSVP changes)
CREATE POLICY "participants_update" ON participants FOR UPDATE USING (true);

-- 4. Index for fast RSVP lookups by event
CREATE INDEX IF NOT EXISTS idx_participants_event_rsvp ON participants(event_id, rsvp);

-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: Long-form body copy field
-- ─────────────────────────────────────────────────────────────────────────────

-- 5. Add body column to events (long-form description, up to 5000 chars)
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS body TEXT
  CHECK (body IS NULL OR char_length(body) <= 5000);
