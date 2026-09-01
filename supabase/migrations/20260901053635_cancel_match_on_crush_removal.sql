/*
# Cancel Match on Crush Removal

## Purpose
When two users have matched (both picked each other as crushes) and
either one removes their crush selection, the match is automatically
cancelled. All chat messages belonging to that match are deleted as
well, since the messages table has ON DELETE CASCADE referencing the
matches table.

## How it works
1. A SECURITY DEFINER trigger function `cancel_match_on_crush_delete`
   runs AFTER DELETE on the `crushes` table.
2. It looks for a match row between the chooser and the crush of the
   deleted crush row.
3. If a match exists, it deletes it. The messages table's foreign key
   has ON DELETE CASCADE, so all messages in that match are removed
   automatically by Postgres.
4. The function is SECURITY DEFINER so it can delete from the matches
   table (which the authenticated role only has SELECT access to).

## Security
- The trigger function is SECURITY DEFINER with a locked search_path
  of 'public', so it runs with the owner's privileges and cannot be
  hijacked via search_path manipulation.
- Only the owner of a crush can delete their own crush row (enforced
  by the existing `crushes_delete_own` RLS policy), so this trigger
  only fires in response to a legitimate user action.
- No new RLS policies are needed; the trigger operates server-side.
*/

CREATE OR REPLACE FUNCTION cancel_match_on_crush_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  match_id uuid;
BEGIN
  -- Find the match between these two users (if any)
  SELECT id INTO match_id
  FROM matches
  WHERE (user_a = LEAST(OLD.chooser_id, OLD.crush_id)
     AND user_b = GREATEST(OLD.chooser_id, OLD.crush_id))
  LIMIT 1;

  -- If a match existed, delete it. Messages cascade-delete automatically.
  IF match_id IS NOT NULL THEN
    DELETE FROM matches WHERE id = match_id;
  END IF;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS on_crush_delete ON crushes;
CREATE TRIGGER on_crush_delete
  AFTER DELETE ON crushes
  FOR EACH ROW
  EXECUTE FUNCTION cancel_match_on_crush_delete();