-- PUSH NOTIFICATIONS: Run this in Supabase SQL Editor
-- Creates the push_subscriptions table for browser push notifications

CREATE TABLE push_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  participant_id UUID REFERENCES participants(id) ON DELETE CASCADE NOT NULL,
  endpoint TEXT NOT NULL,
  keys_p256dh TEXT NOT NULL,
  keys_auth TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, participant_id)
);

CREATE INDEX idx_push_subs_event ON push_subscriptions(event_id);

-- Enable RLS
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "push_subs_insert" ON push_subscriptions FOR INSERT WITH CHECK (true);
CREATE POLICY "push_subs_select" ON push_subscriptions FOR SELECT USING (true);
CREATE POLICY "push_subs_delete" ON push_subscriptions FOR DELETE USING (true);
