-- WeGather.You — participant email (for "time picked" notifications).
-- Run once in the Supabase SQL editor. Safe to re-run (uses IF NOT EXISTS).

ALTER TABLE participants ADD COLUMN IF NOT EXISTS email TEXT;
