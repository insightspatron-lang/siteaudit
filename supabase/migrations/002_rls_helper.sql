-- ─── Phase 2b: RLS Helper Function ──────────────────────────────────────────
-- Creates a helper function API routes call via supabase.rpc('set_user_id', { pass_user_id })
-- before each database operation. This sets the session-level app.user_id setting
-- that the RLS policy in 001_schema.sql references.
--
-- Usage from browser/server:
--   await supabase.rpc('set_user_id', { pass_user_id: 'abc12345' })
--
-- Then all subsequent queries in the same session see rows where user_id = 'abc12345'

CREATE OR REPLACE FUNCTION set_user_id(pass_user_id TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM set_config('app.user_id', pass_user_id, true);
END;
$$;

-- Grant execute to anon (so API routes using the service role key can call it)
GRANT EXECUTE ON FUNCTION set_user_id(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION set_user_id(TEXT) TO authenticated;
