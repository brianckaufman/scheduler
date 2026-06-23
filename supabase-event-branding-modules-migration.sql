-- POLISHED PRO — Phase 2: per-event branding + module toggles.
-- Run in the Supabase SQL Editor.

-- Per-event branding assets (fall back to global/default when null).
ALTER TABLE events ADD COLUMN IF NOT EXISTS logo_url  TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- Independent icon-chip color overrides (null = derive from accent).
ALTER TABLE events ADD COLUMN IF NOT EXISTS icon_bg TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS icon_fg TEXT;

-- Module on/off toggles + future per-event config, as JSON (avoids a column
-- explosion). Shape: { "modules": { "countdown": true, "map": false, ... } }.
ALTER TABLE events ADD COLUMN IF NOT EXISTS config JSONB NOT NULL DEFAULT '{}'::jsonb;
