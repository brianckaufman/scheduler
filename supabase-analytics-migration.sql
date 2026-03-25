-- Analytics enhancement migration
-- Run this in the Supabase SQL Editor

-- Add device_type to participants (captures mobile vs desktop)
ALTER TABLE participants ADD COLUMN IF NOT EXISTS device_type TEXT CHECK (device_type IN ('mobile', 'desktop', 'unknown'));

-- Add device_type to events (captures organizer's device)
ALTER TABLE events ADD COLUMN IF NOT EXISTS device_type TEXT CHECK (device_type IN ('mobile', 'desktop', 'unknown'));

-- Add organizer email for notifications / CRM
ALTER TABLE events ADD COLUMN IF NOT EXISTS organizer_email TEXT;

-- Index for email lookups
CREATE INDEX IF NOT EXISTS idx_events_organizer_email ON events (organizer_email) WHERE organizer_email IS NOT NULL;
