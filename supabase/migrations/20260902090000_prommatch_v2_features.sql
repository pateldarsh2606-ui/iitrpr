/* PromMatch v2: richer profiles, visible crush requests, and campus stats support. */

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS favorite_music text,
  ADD COLUMN IF NOT EXISTS favorite_movie text,
  ADD COLUMN IF NOT EXISTS interests text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS vibe text,
  ADD COLUMN IF NOT EXISTS ideal_prom text;

CREATE TABLE IF NOT EXISTS crush_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','declined')),
  created_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz,
  UNIQUE (sender_id, recipient_id)
);

ALTER TABLE crush_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "crush_requests_select_participant" ON crush_requests;
CREATE POLICY "crush_requests_select_participant" ON crush_requests FOR SELECT
  TO authenticated USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

DROP POLICY IF EXISTS "crush_requests_insert_sender" ON crush_requests;
CREATE POLICY "crush_requests_insert_sender" ON crush_requests FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = sender_id AND sender_id <> recipient_id);

DROP POLICY IF EXISTS "crush_requests_update_recipient" ON crush_requests;
CREATE POLICY "crush_requests_update_recipient" ON crush_requests FOR UPDATE
  TO authenticated USING (auth.uid() = recipient_id) WITH CHECK (auth.uid() = recipient_id);

DROP POLICY IF EXISTS "crush_requests_delete_sender" ON crush_requests;
CREATE POLICY "crush_requests_delete_sender" ON crush_requests FOR DELETE
  TO authenticated USING (auth.uid() = sender_id);

CREATE INDEX IF NOT EXISTS idx_crush_requests_recipient ON crush_requests(recipient_id, status);
CREATE INDEX IF NOT EXISTS idx_crush_requests_sender ON crush_requests(sender_id, status);

-- Keep profile extras private to the same authenticated campus directory rules.
-- Existing profiles SELECT policy already allows authenticated students to read profiles.
