-- WeGather.You — Sequential-block all-day events (vacation / trip planning).
-- Run once in the Supabase SQL editor. Safe to re-run.
--
-- When set, the Find-a-Time picker only surfaces windows of at least this many
-- CONSECUTIVE calendar days that work for everyone (a trip needs one unbroken
-- block, not a scatter of individually-free days). NULL keeps the flexible
-- "any overlapping days" behaviour. Only meaningful for all_day events.
ALTER TABLE events ADD COLUMN IF NOT EXISTS min_block_days INTEGER;

-- A block of 1 day is just a normal all-day event, so the floor is 2. Guarded
-- so the migration is re-runnable and won't fail if the constraint exists.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'events_min_block_days_valid'
  ) THEN
    ALTER TABLE events
      ADD CONSTRAINT events_min_block_days_valid
      CHECK (min_block_days IS NULL OR min_block_days >= 2);
  END IF;
END $$;
