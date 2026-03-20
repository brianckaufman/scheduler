-- Rich Text Migration: Remove character limit on body column
-- Run this in the Supabase SQL Editor
-- Safe to run on existing databases — only drops the old constraint.

-- The body column was previously limited to 5000 characters.
-- Rich text HTML (including tags) can legitimately exceed that,
-- so we remove the constraint and allow any length (Postgres TEXT is unlimited).

ALTER TABLE events
  DROP CONSTRAINT IF EXISTS events_body_length;

-- Verify: the body column should now accept long HTML content.
-- No data migration needed — existing values are unaffected.
