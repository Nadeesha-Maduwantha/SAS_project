-- =============================================================================
-- Cover Access — make sure the trusted Flask backend can always read/write the
-- cover tables, regardless of RLS state. Run once in the Supabase SQL editor
-- (the editor runs as the table owner, so all of this is permitted).
--
-- Why: a freshly created table can have RLS enabled with no policy, so the
-- backend's INSERT fails with 42501 "new row violates row-level security policy".
-- This does three things (belt-and-suspenders):
--   1. GRANT table privileges to the API roles.
--   2. DISABLE row level security on the cover tables.
--   3. Add permissive policies too, so even if something re-enables RLS later,
--      the backend keeps working.
-- =============================================================================

GRANT ALL ON TABLE cover_requests, cover_activity_log
      TO anon, authenticated, service_role;

ALTER TABLE cover_requests     DISABLE ROW LEVEL SECURITY;
ALTER TABLE cover_activity_log DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cover_requests_all ON cover_requests;
CREATE POLICY cover_requests_all ON cover_requests
    FOR ALL TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS cover_activity_all ON cover_activity_log;
CREATE POLICY cover_activity_all ON cover_activity_log
    FOR ALL TO public USING (true) WITH CHECK (true);

-- Verify (run separately): should return rowsecurity = false for both.
-- SELECT relname, relrowsecurity FROM pg_class
--   WHERE relname IN ('cover_requests','cover_activity_log');
