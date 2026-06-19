-- EVENT ACCENT COLOR: optional per-event brand color.
-- Run in the Supabase SQL Editor. Nullable — events without a color use the
-- app's default accent.

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS color TEXT
  CHECK (color IS NULL OR color ~ '^#[0-9A-Fa-f]{6}$');
