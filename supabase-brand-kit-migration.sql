-- POLISHED PRO — Phase 6: account brand kit.
-- Account-level branding defaults that the owner's NEW events inherit.
-- Single-owner (no teams yet). Run in the Supabase SQL Editor.

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
