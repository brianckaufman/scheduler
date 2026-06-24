-- WeGather.You — ALL pending migrations, consolidated & idempotent.
-- Run once in the Supabase SQL editor. Safe to re-run (uses IF NOT EXISTS).
-- Covers: organizer email, per-event color/branding/modules, hide guest list,
-- RSVP guests, event types, static-map coords, custom questions, brand kits.

-- ── Organizer email (notifications) ──────────────────────────────────────────
ALTER TABLE events ADD COLUMN IF NOT EXISTS organizer_email TEXT;

-- ── Per-event accent color ───────────────────────────────────────────────────
ALTER TABLE events ADD COLUMN IF NOT EXISTS color TEXT
  CHECK (color IS NULL OR color ~ '^#[0-9A-Fa-f]{6}$');

-- ── Hide guest list (privacy) ────────────────────────────────────────────────
ALTER TABLE events ADD COLUMN IF NOT EXISTS hide_guest_list BOOLEAN NOT NULL DEFAULT false;

-- ── RSVP guests (per-RSVP additional headcount) ──────────────────────────────
ALTER TABLE participants ADD COLUMN IF NOT EXISTS guest_count INTEGER NOT NULL DEFAULT 0
  CHECK (guest_count >= 0 AND guest_count <= 20);

-- ── Polished Pro: per-event branding + module config ─────────────────────────
ALTER TABLE events ADD COLUMN IF NOT EXISTS logo_url  TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS icon_bg   TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS icon_fg   TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS config    JSONB NOT NULL DEFAULT '{}'::jsonb;

-- ── Event-type framework (casual / birthday / wedding / corporate) ───────────
ALTER TABLE events ADD COLUMN IF NOT EXISTS event_kind TEXT;

-- ── Static map coordinates (geocoded lazily) ─────────────────────────────────
ALTER TABLE events ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION;
ALTER TABLE events ADD COLUMN IF NOT EXISTS lng DOUBLE PRECISION;

-- ── Custom questions + responses ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS event_questions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id   UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  type       TEXT NOT NULL CHECK (type IN ('short_text','long_text','single_select','multi_select','number','yes_no')),
  label      TEXT NOT NULL,
  options    JSONB NOT NULL DEFAULT '[]'::jsonb,
  required   BOOLEAN NOT NULL DEFAULT false,
  position   INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_event_questions_event ON event_questions(event_id);

CREATE TABLE IF NOT EXISTS question_responses (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id       UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  question_id    UUID NOT NULL REFERENCES event_questions(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  value          JSONB NOT NULL DEFAULT 'null'::jsonb,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (question_id, participant_id)
);
CREATE INDEX IF NOT EXISTS idx_question_responses_event ON question_responses(event_id);

ALTER TABLE event_questions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_responses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS event_questions_read ON event_questions;
CREATE POLICY event_questions_read ON event_questions FOR SELECT USING (true);
-- question_responses: no anon policy → only the service role reads/writes (via API).

-- ── Account brand kit (account-level branding inherited by new events) ───────
CREATE TABLE IF NOT EXISTS brand_kits (
  user_id     UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  logo_url    TEXT,
  brand_color TEXT,
  icon_bg     TEXT,
  icon_fg     TEXT,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE brand_kits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS brand_kits_own ON brand_kits;
CREATE POLICY brand_kits_own ON brand_kits
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
