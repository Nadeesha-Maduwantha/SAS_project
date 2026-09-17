-- =============================================================================
-- SAS — Cover Access: admin-configurable department policy. Controls how far
-- the "no department on file" exception reaches in services/cover_access.py
-- (list_colleagues / create_request). Symmetric — it doesn't matter which
-- side of the pair (the owner whose work needs covering, or the colleague
-- who'd provide the cover) has no department, either one can trigger it.
-- Applies identically to Sales and Operation roles. Run once in the
-- Supabase SQL editor.
--
--   strict           - department always has to match on both sides; a
--                       department-less person is never coverable/covering
--                       through this rule.
--   unassigned_only   - the exception only applies when BOTH sides have no
--                       department on file (a department-less pair can
--                       cover each other, but can't reach into Sea/Air).
--   any_department    - if EITHER side has no department on file, department
--                       is ignored entirely for that pair (the original/
--                       default behavior).
-- =============================================================================

ALTER TABLE sync_settings
  ADD COLUMN IF NOT EXISTS cover_department_policy text NOT NULL DEFAULT 'any_department';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'sync_settings_cover_department_policy_check'
  ) THEN
    ALTER TABLE sync_settings
      ADD CONSTRAINT sync_settings_cover_department_policy_check
      CHECK (cover_department_policy IN ('strict', 'unassigned_only', 'any_department'));
  END IF;
END $$;
