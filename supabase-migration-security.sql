-- SECURITY MIGRATION: Run this in Supabase SQL Editor on your live database
-- This adds database-level constraints and enables real-time DELETE support

-- 1. Add length constraints to prevent abuse
ALTER TABLE events ADD CONSTRAINT events_name_length CHECK (char_length(name) <= 100);
ALTER TABLE events ADD CONSTRAINT events_desc_length CHECK (description IS NULL OR char_length(description) <= 500);
ALTER TABLE events ADD CONSTRAINT events_org_name_length CHECK (organizer_name IS NULL OR char_length(organizer_name) <= 50);
ALTER TABLE events ADD CONSTRAINT events_location_length CHECK (location IS NULL OR char_length(location) <= 100);
ALTER TABLE events ADD CONSTRAINT events_duration_valid CHECK (duration_minutes IN (30, 60, 90, 120, 180, 240));

ALTER TABLE participants ADD CONSTRAINT participants_name_length CHECK (char_length(name) <= 50);

-- 2. Enable REPLICA IDENTITY FULL so real-time DELETE events include the full row
-- (This is what makes participant/slot removal show up instantly for other users)
ALTER TABLE participants REPLICA IDENTITY FULL;
ALTER TABLE availability_slots REPLICA IDENTITY FULL;

-- 3. Add missing delete policy for participants (needed for organizer remove feature)
-- Check if it exists first — if you get an error "already exists", that's fine, skip it.
CREATE POLICY "participants_delete" ON participants FOR DELETE USING (true);
