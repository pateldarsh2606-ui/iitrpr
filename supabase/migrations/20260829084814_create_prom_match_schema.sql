/*
# IITRPR Prom Match — Core Schema

## Overview
Creates the full data model for the IIT Ropar Prom Match portal: student
profiles, secret crush selections, mutual matches, and match-scoped chat
messages. All tables use Row Level Security so the browser-side Supabase
client can only read/write what the signed-in user is allowed to see.

## Tables
- profiles: one row per student (name, department, entry number, bio).
- crushes: secret chooser->crush selections (max 3 enforced in app).
- matches: canonical mutual-match pairs (user_a < user_b), unique.
- messages: chat messages scoped to a match.

## Security (RLS)
- profiles: authenticated read all; insert/update own only.
- crushes: only the chooser can read/insert/delete their own rows — the
  target of a crush can never see who picked them.
- matches: only participants can read their matches.
- messages: only match participants can read/send messages in that match.

## Match detection
A SECURITY DEFINER trigger `detect_mutual_match` runs AFTER INSERT on
crushes. If the reverse crush already exists, it inserts a canonical
match row (ON CONFLICT keeps it idempotent). This powers the
"It's a Match!" moment for both users.
*/

-- profiles
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  department text NOT NULL,
  entry_number text NOT NULL,
  bio text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_authenticated" ON profiles;
CREATE POLICY "profiles_select_authenticated" ON profiles FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- crushes
CREATE TABLE IF NOT EXISTS crushes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chooser_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  crush_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (chooser_id, crush_id)
);

ALTER TABLE crushes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "crushes_select_own" ON crushes;
CREATE POLICY "crushes_select_own" ON crushes FOR SELECT
  TO authenticated USING (auth.uid() = chooser_id);

DROP POLICY IF EXISTS "crushes_insert_own" ON crushes;
CREATE POLICY "crushes_insert_own" ON crushes FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = chooser_id);

DROP POLICY IF EXISTS "crushes_delete_own" ON crushes;
CREATE POLICY "crushes_delete_own" ON crushes FOR DELETE
  TO authenticated USING (auth.uid() = chooser_id);

-- matches
CREATE TABLE IF NOT EXISTS matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  user_b uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (user_a <> user_b),
  UNIQUE (user_a, user_b)
);

ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "matches_select_participant" ON matches;
CREATE POLICY "matches_select_participant" ON matches FOR SELECT
  TO authenticated USING (auth.uid() = user_a OR auth.uid() = user_b);

-- messages
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "messages_select_participant" ON messages;
CREATE POLICY "messages_select_participant" ON messages FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM matches m
      WHERE m.id = messages.match_id
      AND (m.user_a = auth.uid() OR m.user_b = auth.uid())
    )
  );

DROP POLICY IF EXISTS "messages_insert_participant" ON messages;
CREATE POLICY "messages_insert_participant" ON messages FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM matches m
      WHERE m.id = messages.match_id
      AND (m.user_a = auth.uid() OR m.user_b = auth.uid())
    )
    AND auth.uid() = sender_id
  );

-- Mutual match detection trigger
CREATE OR REPLACE FUNCTION detect_mutual_match()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  a uuid;
  b uuid;
BEGIN
  a := LEAST(NEW.chooser_id, NEW.crush_id);
  b := GREATEST(NEW.chooser_id, NEW.crush_id);

  IF EXISTS (
    SELECT 1 FROM crushes
    WHERE chooser_id = NEW.crush_id AND crush_id = NEW.chooser_id
  ) THEN
    INSERT INTO matches (user_a, user_b)
    VALUES (a, b)
    ON CONFLICT (user_a, user_b) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_crush_insert ON crushes;
CREATE TRIGGER on_crush_insert
  AFTER INSERT ON crushes
  FOR EACH ROW
  EXECUTE FUNCTION detect_mutual_match();

CREATE INDEX IF NOT EXISTS idx_crushes_chooser ON crushes(chooser_id);
CREATE INDEX IF NOT EXISTS idx_crushes_crush ON crushes(crush_id);
CREATE INDEX IF NOT EXISTS idx_matches_user_a ON matches(user_a);
CREATE INDEX IF NOT EXISTS idx_matches_user_b ON matches(user_b);
CREATE INDEX IF NOT EXISTS idx_messages_match ON messages(match_id, created_at);
