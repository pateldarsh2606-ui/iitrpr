/* PromMatch v2: allow either match participant to unmatch securely. */

CREATE OR REPLACE FUNCTION unmatch_match(p_match_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM matches
  WHERE id = p_match_id
    AND (user_a = auth.uid() OR user_b = auth.uid());

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count = 1;
END;
$$;

REVOKE ALL ON FUNCTION unmatch_match(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION unmatch_match(uuid) TO authenticated;
