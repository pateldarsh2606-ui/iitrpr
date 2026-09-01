/*
# Correct security-definer function permissions

1. Changes
- Removes the default PUBLIC EXECUTE grant from the profile completion function.
- Removes the default PUBLIC EXECUTE grant from the mutual-match trigger function.
- Restores profile completion access only for authenticated users.

2. Security
- Anonymous users cannot call either SECURITY DEFINER function through the Data API.
- The mutual-match function remains usable by its database trigger because trigger execution is independent of RPC grants.

3. Important Notes
- This migration corrects the earlier permission change by revoking PUBLIC, not only the named API roles.
- No user data or table structure is changed.
*/

REVOKE EXECUTE ON FUNCTION detect_mutual_match() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION complete_profile(p_full_name text, p_department text, p_entry_number text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION complete_profile(p_full_name text, p_department text, p_entry_number text) TO authenticated;
