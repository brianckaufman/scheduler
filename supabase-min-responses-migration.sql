-- Minimum responses migration
-- Run this in the Supabase SQL Editor before using the "minimum responses" feature.
-- This adds an optional field that lets organizers require a minimum number of
-- responses before a time is suggested for selection.

ALTER TABLE events ADD COLUMN IF NOT EXISTS min_responses INT CHECK (min_responses >= 2);
