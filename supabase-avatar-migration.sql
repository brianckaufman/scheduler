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

-- Auto-use a Google account's photo: copy it into the profile on signup so it
-- appears on the user's events without re-uploading. Custom uploads still win
-- (this runs only at signup, and the backfill below only fills NULLs).
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'display_name',
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name'
    ),
    COALESCE(
      NEW.raw_user_meta_data->>'avatar_url',
      NEW.raw_user_meta_data->>'picture'
    )
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Backfill existing users (e.g. anyone who signed in with Google before this ran)
-- who haven't uploaded a custom avatar.
UPDATE public.profiles p
SET avatar_url = COALESCE(u.raw_user_meta_data->>'avatar_url', u.raw_user_meta_data->>'picture')
FROM auth.users u
WHERE p.id = u.id
  AND p.avatar_url IS NULL
  AND COALESCE(u.raw_user_meta_data->>'avatar_url', u.raw_user_meta_data->>'picture') IS NOT NULL;
