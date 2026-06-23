-- POLISHED PRO — Phase 4: custom questions + responses.
-- Run in the Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS event_questions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id     UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  type         TEXT NOT NULL CHECK (type IN ('short_text','long_text','single_select','multi_select','number','yes_no')),
  label        TEXT NOT NULL,
  options      JSONB NOT NULL DEFAULT '[]'::jsonb,   -- choices for select types
  required     BOOLEAN NOT NULL DEFAULT false,
  position     INT NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
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

-- RLS: questions are public to read (guests must see them); all writes and all
-- response access go through service-role API routes (organizer_token / the
-- participant's own id are validated server-side).
ALTER TABLE event_questions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_responses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS event_questions_read ON event_questions;
CREATE POLICY event_questions_read ON event_questions FOR SELECT USING (true);
-- question_responses: no anon policies → only the service role can touch them.
