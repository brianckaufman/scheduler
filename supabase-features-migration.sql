-- Migration: Delete Event, Participant Limit, Export CSV features
-- Safe to re-run: all statements are idempotent.

-- 1. Add max_participants column to events (nullable = no limit)
DO $$ BEGIN
  ALTER TABLE events ADD COLUMN max_participants INTEGER DEFAULT NULL;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- 2. Allow event deletion via RLS (service role bypasses, but explicit for safety)
DO $$ BEGIN
  CREATE POLICY "events_delete" ON events
    FOR DELETE USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 3. Ensure CASCADE deletes are set up for participants and availability_slots
-- (These should already exist from initial schema, but verify)
-- If your schema already has ON DELETE CASCADE foreign keys, this is a no-op.
-- Otherwise, you may need to manually add them:
--
-- ALTER TABLE participants DROP CONSTRAINT IF EXISTS participants_event_id_fkey;
-- ALTER TABLE participants ADD CONSTRAINT participants_event_id_fkey
--   FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;
--
-- ALTER TABLE availability_slots DROP CONSTRAINT IF EXISTS availability_slots_event_id_fkey;
-- ALTER TABLE availability_slots ADD CONSTRAINT availability_slots_event_id_fkey
--   FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;
