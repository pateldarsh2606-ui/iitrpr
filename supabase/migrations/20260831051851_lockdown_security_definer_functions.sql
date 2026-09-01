-- The detect_mutual_match function is a trigger function and should
-- never be called directly via RPC. Revoke EXECUTE from anon and
-- authenticated — the trigger still fires because it runs with the
-- owner's privileges, not the caller's.
REVOKE EXECUTE ON FUNCTION detect_mutual_match() FROM anon, authenticated;

-- complete_profile is meant to be called by signed-in users only.
-- Revoke from anon so unauthenticated requests can't invoke it.
REVOKE EXECUTE ON FUNCTION complete_profile(p_full_name text, p_department text, p_entry_number text) FROM anon;
