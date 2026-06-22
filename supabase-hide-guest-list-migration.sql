-- HIDE GUEST LIST: let the organizer keep the responder/participant list
-- private (only they see the full names; guests still see aggregate totals).
-- Run in the Supabase SQL Editor.

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS hide_guest_list BOOLEAN NOT NULL DEFAULT false;
