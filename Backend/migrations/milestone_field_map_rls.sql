-- =============================================================================
-- Fix: "new row violates row-level security policy" (42501) on milestone_field_map
--
-- The table already has SELECT + INSERT policies, but no UPDATE or DELETE policy.
-- The registry write is an UPSERT (INSERT ... ON CONFLICT DO UPDATE), so when the
-- (milestone_key, api_field) row already exists it needs UPDATE; the × button
-- needs UPDATE (deactivate) / DELETE. Add those. CREATE-only, nothing dropped.
--
-- Run once in the Supabase SQL editor.
-- =============================================================================

CREATE POLICY allow_update_field_map ON milestone_field_map
  FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY allow_delete_field_map ON milestone_field_map
  FOR DELETE USING (true);
