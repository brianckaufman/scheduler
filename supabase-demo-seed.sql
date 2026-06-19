-- ============================================================================
-- DEMO EVENTS SEED  →  owned by brian@tippingmedia.com
-- Run in the Supabase SQL Editor (full privileges).
--
-- Prerequisites:
--   • supabase-accounts-migration.sql has been run (events.user_id exists). ✓
--   • brian@tippingmedia.com has signed in at least once (so the auth user
--     exists). If not, the events are still created but won't be linked to the
--     account — a NOTICE is raised.
--
-- Timezone note: the availability grids are calibrated for US Eastern time
-- (the app generates grid cells from the viewer's local clock). Eastern viewers
-- see the designed overlap exactly; other US zones see it shifted by their
-- offset. Re-run anytime — it deletes and recreates the demo events by slug.
-- ============================================================================

DO $$
DECLARE
  v_user uuid;
  e_offsite uuid;
  e_thanks  uuid;
  e_emma    uuid;
  e_holiday uuid;
BEGIN
  SELECT id INTO v_user FROM auth.users WHERE lower(email) = 'brian@tippingmedia.com' LIMIT 1;
  IF v_user IS NULL THEN
    RAISE NOTICE 'No auth user for brian@tippingmedia.com yet — creating demos UNLINKED. Sign in once with Google, then re-run to attach them.';
  END IF;

  -- Idempotent: remove any prior demo events (cascades to participants + slots).
  DELETE FROM events WHERE slug IN
    ('demo-q3-team-offsite','demo-family-thanksgiving','demo-emma-birthday','demo-company-holiday-party');

  -- ───────────────────────────────────────────────────────────────────────
  -- 1) AVAILABILITY — Q3 Team Offsite (business; clear 7-of-8 winner)
  -- ───────────────────────────────────────────────────────────────────────
  INSERT INTO events (slug, name, organizer_name, description, location, dates,
                      time_start, time_end, timezone, duration_minutes, event_type,
                      organizer_token, user_id)
  VALUES ('demo-q3-team-offsite', 'Q3 Team Offsite', 'Sarah Johnson',
          'Help us find the best time for our quarterly team offsite. Select every date and time you could attend — we''ll choose the option that works for the most people.',
          'Silver Falls Conference Center',
          ARRAY['2026-09-15','2026-09-16','2026-09-17','2026-09-18']::date[],
          '09:00', '15:00', 'America/New_York', 60, 'availability',
          replace(gen_random_uuid()::text, '-', ''), v_user)
  RETURNING id INTO e_offsite;

  INSERT INTO participants (event_id, name)
  SELECT e_offsite, n FROM unnest(ARRAY[
    'Sarah Johnson','Mark','Jennifer','Alex','David','Emily','Chris','Amanda']) n;

  INSERT INTO availability_slots (event_id, participant_id, slot_start)
  SELECT e_offsite, p.id, s.slot::timestamptz
  FROM (VALUES
    ('Sarah Johnson','2026-09-15 10:00:00-04'),('Sarah Johnson','2026-09-15 11:00:00-04'),
    ('Sarah Johnson','2026-09-16 09:00:00-04'),('Sarah Johnson','2026-09-16 10:00:00-04'),('Sarah Johnson','2026-09-16 11:00:00-04'),
    ('Sarah Johnson','2026-09-17 10:00:00-04'),('Sarah Johnson','2026-09-17 11:00:00-04'),
    ('Mark','2026-09-15 10:00:00-04'),('Mark','2026-09-15 11:00:00-04'),('Mark','2026-09-15 12:00:00-04'),('Mark','2026-09-16 10:00:00-04'),
    ('Jennifer','2026-09-16 09:00:00-04'),('Jennifer','2026-09-16 10:00:00-04'),('Jennifer','2026-09-16 11:00:00-04'),('Jennifer','2026-09-16 12:00:00-04'),
    ('Jennifer','2026-09-17 10:00:00-04'),('Jennifer','2026-09-17 11:00:00-04'),
    ('Alex','2026-09-15 11:00:00-04'),('Alex','2026-09-16 10:00:00-04'),('Alex','2026-09-16 11:00:00-04'),('Alex','2026-09-16 12:00:00-04'),
    ('Alex','2026-09-17 11:00:00-04'),('Alex','2026-09-18 11:00:00-04'),
    ('David','2026-09-15 09:00:00-04'),('David','2026-09-15 10:00:00-04'),('David','2026-09-17 10:00:00-04'),('David','2026-09-17 11:00:00-04'),('David','2026-09-18 10:00:00-04'),
    ('Emily','2026-09-16 09:00:00-04'),('Emily','2026-09-16 10:00:00-04'),
    ('Chris','2026-09-15 10:00:00-04'),('Chris','2026-09-16 10:00:00-04'),('Chris','2026-09-16 11:00:00-04'),
    ('Chris','2026-09-17 10:00:00-04'),('Chris','2026-09-17 11:00:00-04'),('Chris','2026-09-17 12:00:00-04'),
    ('Amanda','2026-09-16 10:00:00-04'),('Amanda','2026-09-16 11:00:00-04'),('Amanda','2026-09-17 10:00:00-04'),('Amanda','2026-09-17 11:00:00-04'),('Amanda','2026-09-18 11:00:00-04')
  ) AS s(pname, slot)
  JOIN participants p ON p.event_id = e_offsite AND p.name = s.pname;
  -- → Winner: Wed Sep 16, 10:00 AM = 7 of 8 (everyone but David).

  -- ───────────────────────────────────────────────────────────────────────
  -- 2) AVAILABILITY — Family Thanksgiving Dinner (personal; everyone-free win)
  -- ───────────────────────────────────────────────────────────────────────
  INSERT INTO events (slug, name, organizer_name, description, location, dates,
                      time_start, time_end, timezone, duration_minutes, event_type,
                      organizer_token, user_id)
  VALUES ('demo-family-thanksgiving', 'Family Thanksgiving Dinner', 'Grandma Rose',
          'We''re trying to find the best time for everyone to celebrate together. Check every time your family can attend and we''ll choose the option with the most overlap.',
          'Mom & Dad''s house',
          ARRAY['2026-11-26','2026-11-27']::date[],
          '11:00', '17:00', 'America/New_York', 120, 'availability',
          replace(gen_random_uuid()::text, '-', ''), v_user)
  RETURNING id INTO e_thanks;

  INSERT INTO participants (event_id, name)
  SELECT e_thanks, n FROM unnest(ARRAY[
    'Grandma Rose','Linda','Tom','Aunt Carol','Uncle Joe','Mia','Ben']) n;

  INSERT INTO availability_slots (event_id, participant_id, slot_start)
  SELECT e_thanks, p.id, s.slot::timestamptz
  FROM (VALUES
    ('Grandma Rose','2026-11-26 11:00:00-05'),('Grandma Rose','2026-11-26 13:00:00-05'),('Grandma Rose','2026-11-26 15:00:00-05'),('Grandma Rose','2026-11-27 13:00:00-05'),
    ('Linda','2026-11-26 13:00:00-05'),('Linda','2026-11-26 15:00:00-05'),('Linda','2026-11-27 13:00:00-05'),
    ('Tom','2026-11-26 11:00:00-05'),('Tom','2026-11-26 13:00:00-05'),('Tom','2026-11-27 11:00:00-05'),('Tom','2026-11-27 13:00:00-05'),
    ('Aunt Carol','2026-11-26 13:00:00-05'),('Aunt Carol','2026-11-27 13:00:00-05'),('Aunt Carol','2026-11-27 15:00:00-05'),
    ('Uncle Joe','2026-11-26 13:00:00-05'),('Uncle Joe','2026-11-26 15:00:00-05'),
    ('Mia','2026-11-26 13:00:00-05'),('Mia','2026-11-27 13:00:00-05'),
    ('Ben','2026-11-26 11:00:00-05'),('Ben','2026-11-26 13:00:00-05'),('Ben','2026-11-27 15:00:00-05')
  ) AS s(pname, slot)
  JOIN participants p ON p.event_id = e_thanks AND p.name = s.pname;
  -- → Winner: Thu Nov 26, 1:00 PM = all 7 (the green "everyone can meet" state).

  -- ───────────────────────────────────────────────────────────────────────
  -- 3) RSVP — Emma's 10th Birthday Party (universal; 18 yes / 3 maybe / 4 no)
  -- ───────────────────────────────────────────────────────────────────────
  INSERT INTO events (slug, name, organizer_name, description, location, dates,
                      time_start, time_end, timezone, duration_minutes, event_type,
                      finalized_time, response_deadline, organizer_token, user_id)
  VALUES ('demo-emma-birthday', 'Emma''s 10th Birthday Party 🎉', 'Jessica Martin',
          'Join us for an afternoon of pizza, games, cake, and a scavenger hunt. Please RSVP by August 15 so we can plan food and party favors.',
          'Riverfront Park Pavilion',
          ARRAY['2026-08-22']::date[], '14:00', '17:00', 'America/New_York', 180, 'fixed',
          '2026-08-22 14:00:00-04'::timestamptz, '2026-08-15 23:59:59-04'::timestamptz,
          replace(gen_random_uuid()::text, '-', ''), v_user)
  RETURNING id INTO e_emma;

  INSERT INTO participants (event_id, name, rsvp)
  SELECT e_emma, t.name, t.rsvp FROM (VALUES
    ('Jessica Martin','yes'),('David Chen','yes'),('Maria Lopez','yes'),('Tom Bradley','yes'),
    ('Aisha Khan','yes'),('Rachel Green','yes'),('Mike Sullivan','yes'),('Priya Patel','yes'),
    ('Kevin O''Brien','yes'),('Sofia Russo','yes'),('James Carter','yes'),('Nina Williams','yes'),
    ('Carlos Mendez','yes'),('Beth Anderson','yes'),('Sam Taylor','yes'),('Olivia Brooks','yes'),
    ('Daniel Kim','yes'),('Grace Liu','yes'),
    ('Laura Bennett','maybe'),('Eric Foster','maybe'),('Hannah Reyes','maybe'),
    ('Paul Jenkins','no'),('Megan Scott','no'),('Ryan Cooper','no'),('Tara Singh','no')
  ) AS t(name, rsvp);

  -- ───────────────────────────────────────────────────────────────────────
  -- 4) RSVP — Company Holiday Party (business; 14 yes / 4 maybe / 2 no)
  -- ───────────────────────────────────────────────────────────────────────
  INSERT INTO events (slug, name, organizer_name, description, location, dates,
                      time_start, time_end, timezone, duration_minutes, event_type,
                      finalized_time, response_deadline, organizer_token, user_id)
  VALUES ('demo-company-holiday-party', 'Company Holiday Party', 'Dana Reeves',
          'You''re invited to our annual holiday celebration — dinner, drinks, awards, and a photo booth. Please RSVP by December 5 so we can finalize the headcount.',
          'The Grand Ballroom, Hotel Met',
          ARRAY['2026-12-12']::date[], '18:30', '21:30', 'America/New_York', 180, 'fixed',
          '2026-12-12 18:30:00-05'::timestamptz, '2026-12-05 23:59:59-05'::timestamptz,
          replace(gen_random_uuid()::text, '-', ''), v_user)
  RETURNING id INTO e_holiday;

  INSERT INTO participants (event_id, name, rsvp)
  SELECT e_holiday, t.name, t.rsvp FROM (VALUES
    ('Dana Reeves','yes'),('Marcus Hill','yes'),('Yuki Tanaka','yes'),('Sophie Dubois','yes'),
    ('Andre Wright','yes'),('Lena Park','yes'),('Victor Alvarez','yes'),('Hannah Cole','yes'),
    ('Raj Mehta','yes'),('Claire Fontaine','yes'),('Devon Banks','yes'),('Mei Chen','yes'),
    ('Greg Olsen','yes'),('Tasha Brooks','yes'),
    ('Omar Haddad','maybe'),('Julia Stein','maybe'),('Ben Walsh','maybe'),('Nora Fitz','maybe'),
    ('Pete Donovan','no'),('Kim Lee','no')
  ) AS t(name, rsvp);

  RAISE NOTICE 'Demo events seeded: Q3 Team Offsite, Family Thanksgiving Dinner, Emma''s Birthday, Company Holiday Party.';
END $$;
