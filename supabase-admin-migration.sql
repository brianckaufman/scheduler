-- Run this in the Supabase SQL Editor to add the site_settings table for admin panel

-- Site settings table (single-row JSONB pattern)
CREATE TABLE site_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert the default row
INSERT INTO site_settings (id, settings) VALUES (1, '{}'::jsonb);

-- RLS: anyone can read settings (needed for layout/SEO), only service role can write
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "settings_select" ON site_settings FOR SELECT USING (true);
-- No insert/update/delete policies for anon — admin writes use service role key
