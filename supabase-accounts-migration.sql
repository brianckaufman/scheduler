-- OPTIONAL USER ACCOUNTS (Supabase Auth)
-- Run in Supabase SQL Editor. Also enable Email + Google providers under
-- Authentication → Providers in the Supabase dashboard.
--
-- Accounts are purely additive: anonymous event creation / RSVP / pick-a-time
-- keep working. user_id columns are nullable.

-- ── 1. Profiles (1:1 with auth.users) ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT CHECK (display_name IS NULL OR char_length(display_name) <= 50),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
CREATE POLICY "profiles_select_own" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Auto-create a profile row whenever a user signs up. Pulls a display name from
-- OAuth metadata (Google "name"/"full_name") or the email/password signup
-- "display_name" metadata when present.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'display_name',
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name'
    )
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── 2. Link events + participants to a user (nullable) ───────────────────────
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE participants
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_events_user ON events(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_participants_user ON participants(user_id) WHERE user_id IS NOT NULL;

-- ── 3. Saved / bookmarked events ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS saved_events (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, event_id)
);

ALTER TABLE saved_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "saved_select_own" ON saved_events;
DROP POLICY IF EXISTS "saved_insert_own" ON saved_events;
DROP POLICY IF EXISTS "saved_delete_own" ON saved_events;
CREATE POLICY "saved_select_own" ON saved_events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "saved_insert_own" ON saved_events FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "saved_delete_own" ON saved_events FOR DELETE USING (auth.uid() = user_id);
