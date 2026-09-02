/* PromMatch v2: anonymous campus statistics. */

CREATE OR REPLACE FUNCTION get_campus_stats()
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'students', (SELECT count(*) FROM profiles),
    'matches', (SELECT count(*) FROM matches),
    'departments', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('name', department, 'count', count) ORDER BY count DESC, department)
      FROM (
        SELECT department, count(*)::int AS count
        FROM profiles
        GROUP BY department
        ORDER BY count(*) DESC, department
        LIMIT 8
      ) d
    ), '[]'::jsonb),
    'vibes', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('name', vibe, 'count', count) ORDER BY count DESC, vibe)
      FROM (
        SELECT vibe, count(*)::int AS count
        FROM profiles
        WHERE vibe IS NOT NULL AND vibe <> ''
        GROUP BY vibe
        ORDER BY count(*) DESC, vibe
        LIMIT 8
      ) v
    ), '[]'::jsonb)
  );
$$;

REVOKE ALL ON FUNCTION get_campus_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_campus_stats() TO authenticated;
