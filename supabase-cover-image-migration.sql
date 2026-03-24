-- Migration: add cover_image_url to events table
-- Run in the Supabase SQL Editor

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS cover_image_url TEXT;
