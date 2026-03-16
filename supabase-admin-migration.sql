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

-- ============================================================
-- Supabase Storage: create the "assets" bucket for image uploads
-- NOTE: Run this via Supabase SQL Editor or create the bucket
-- manually in Dashboard > Storage > New Bucket
-- ============================================================

-- Create a public bucket for admin-uploaded images (OG, favicon, logo)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'assets',
  'assets',
  true,
  5242880, -- 5 MB
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml', 'image/x-icon', 'image/vnd.microsoft.icon', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Allow public reads on the assets bucket
CREATE POLICY "assets_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'assets');

-- Allow service role (admin) to upload and delete
-- (Service role bypasses RLS, but explicit policies don't hurt)
CREATE POLICY "assets_admin_insert" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'assets');

CREATE POLICY "assets_admin_delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'assets');
