-- POLISHED PRO — Phase 5: geocoded coordinates for the static map.
-- Run in the Supabase SQL Editor. Populated lazily by /api/events/[id]/map
-- when a Google Maps key is configured.

ALTER TABLE events ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION;
ALTER TABLE events ADD COLUMN IF NOT EXISTS lng DOUBLE PRECISION;
