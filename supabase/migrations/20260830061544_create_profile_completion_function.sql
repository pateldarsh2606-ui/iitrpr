-- SECURITY DEFINER function to upsert a profile, bypassing RLS.
-- This avoids issues where the client-side session isn't fully
-- established (e.g. email confirmation pending) and RLS blocks the insert.

CREATE OR REPLACE FUNCTION complete_profile(
  p_full_name text,
  p_department text,
  p_entry_number text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO profiles (id, full_name, department, entry_number)
  VALUES (auth.uid(), p_full_name, p_department, p_entry_number)
  ON CONFLICT (id) DO UPDATE
  SET full_name = EXCLUDED.full_name,
      department = EXCLUDED.department,
      entry_number = EXCLUDED.entry_number;
END;
$$;

GRANT EXECUTE ON FUNCTION complete_profile TO authenticated;