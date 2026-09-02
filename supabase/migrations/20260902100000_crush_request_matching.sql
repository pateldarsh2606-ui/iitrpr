/* PromMatch v2: accepted Crush Requests create canonical matches. */

CREATE OR REPLACE FUNCTION create_match_from_crush_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  a uuid;
  b uuid;
BEGIN
  IF NEW.status = 'accepted' AND (OLD.status IS DISTINCT FROM 'accepted') THEN
    a := LEAST(NEW.sender_id, NEW.recipient_id);
    b := GREATEST(NEW.sender_id, NEW.recipient_id);

    INSERT INTO matches (user_a, user_b)
    VALUES (a, b)
    ON CONFLICT (user_a, user_b) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_crush_request_accepted ON crush_requests;
CREATE TRIGGER on_crush_request_accepted
  AFTER UPDATE OF status ON crush_requests
  FOR EACH ROW
  EXECUTE FUNCTION create_match_from_crush_request();

CREATE INDEX IF NOT EXISTS idx_crush_requests_status_recipient
  ON crush_requests(recipient_id, status);
