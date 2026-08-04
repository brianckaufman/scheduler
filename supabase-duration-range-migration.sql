-- WeGather.You — allow event durations longer than 4 hours.
--
-- events.duration_minutes was pinned to a fixed enum whose largest value was
-- 240 (4 hours), so a wedding, conference, festival or open-house couldn't be
-- expressed as a timed event at all. Replace the enum with a bounded range:
-- anything from 5 minutes up to a full day.
--
-- The UI never offers an end time that crosses midnight, so 1440 is the real
-- ceiling. All-day events keep using 240 as their (meaningless) sentinel,
-- which stays inside the range.
--
-- Run once in the Supabase SQL editor. Safe to re-run.

ALTER TABLE events DROP CONSTRAINT IF EXISTS events_duration_valid;

ALTER TABLE events ADD CONSTRAINT events_duration_valid
  CHECK (duration_minutes > 0 AND duration_minutes <= 1440);

-- Verify:
--   SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint
--   WHERE conrelid = 'public.events'::regclass AND conname = 'events_duration_valid';
