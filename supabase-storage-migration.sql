-- Run this in the Supabase SQL Editor to add the "assets" storage bucket
-- (Only needed if you already ran supabase-admin-migration.sql before the storage section was added)

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

-- Allow uploads and deletes (service role bypasses RLS, but explicit policies for safety)
CREATE POLICY "assets_admin_insert" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'assets');

CREATE POLICY "assets_admin_delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'assets');
