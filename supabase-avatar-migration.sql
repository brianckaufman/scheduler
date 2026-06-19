-- PROFILE AVATARS: Run in Supabase SQL Editor (after supabase-accounts-migration.sql).
-- Adds an avatar URL to profiles and makes profiles publicly readable so an
-- event can display its organizer's name + avatar. (Profiles contain only a
-- display name and avatar URL — both intended to be shown publicly. Email is
-- NOT stored in profiles.)

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Allow anyone to read profiles (display_name + avatar_url). This supersedes the
-- own-only select policy from the accounts migration (policies are OR-ed).
DROP POLICY IF EXISTS "profiles_select_public" ON profiles;
CREATE POLICY "profiles_select_public" ON profiles FOR SELECT USING (true);
