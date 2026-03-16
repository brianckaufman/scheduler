-- Run this in the Supabase SQL Editor to set up the database

-- Events table
CREATE TABLE events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  organizer_name TEXT,
  location TEXT,
  duration_minutes INTEGER DEFAULT 30,
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
  name TEXT NOT NULL,
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

-- Enable real-time
ALTER PUBLICATION supabase_realtime ADD TABLE availability_slots;
ALTER PUBLICATION supabase_realtime ADD TABLE participants;

-- Row Level Security
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "events_select" ON events FOR SELECT USING (true);
CREATE POLICY "events_insert" ON events FOR INSERT WITH CHECK (true);
CREATE POLICY "events_update" ON events FOR UPDATE USING (true);
CREATE POLICY "participants_select" ON participants FOR SELECT USING (true);
CREATE POLICY "participants_insert" ON participants FOR INSERT WITH CHECK (true);
CREATE POLICY "slots_select" ON availability_slots FOR SELECT USING (true);
CREATE POLICY "slots_insert" ON availability_slots FOR INSERT WITH CHECK (true);
CREATE POLICY "slots_delete" ON availability_slots FOR DELETE USING (true);
