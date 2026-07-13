-- WeGather.You — device-type analytics (organizer + participant device).
-- Run once in the Supabase SQL editor. Safe to re-run (uses IF NOT EXISTS).
-- NOTE: the app currently does NOT write device_type yet (the insert calls
-- are commented out pending this migration) — running this alone won't
-- populate the admin analytics device breakdown; the write-side needs
-- uncommenting in src/app/api/events/route.ts and src/app/api/participants/route.ts.

ALTER TABLE events       ADD COLUMN IF NOT EXISTS device_type TEXT;
ALTER TABLE participants ADD COLUMN IF NOT EXISTS device_type TEXT;
