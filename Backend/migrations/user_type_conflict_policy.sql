-- =============================================================================
-- SAS — User Type Rules: conflict handling for people who ALREADY have a
-- profile whose role does not match what the identification rules now detect
-- (e.g. someone was manually created as Operation User, but later shipment
-- data also shows their email in shipments.sales_user_email).
--
-- Without this, the scan (services/user_type_rules.py scan_for_unmatched_people)
-- only ever looks at emails with NO profile yet — an existing account's role
-- is always left alone, silently, with no way to see or change that. This
-- makes that an explicit, admin-configurable choice:
--
--   skip     (default) - never touch or even surface an existing account's
--             role from this data. The same behavior as before this setting
--             existed.
--   replace  - queue the mismatch in user_type_conflicts for an admin to
--             review, in System Settings -> User Type Rules -> Role conflicts.
--             Still requires an explicit "Replace role" click per person —
--             nothing overwrites a role silently in the background.
--
-- Run once in the Supabase SQL editor. Idempotent.
-- =============================================================================

ALTER TABLE sync_settings
  ADD COLUMN IF NOT EXISTS user_type_conflict_policy text NOT NULL DEFAULT 'skip';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'sync_settings_user_type_conflict_policy_check'
  ) THEN
    ALTER TABLE sync_settings
      ADD CONSTRAINT sync_settings_user_type_conflict_policy_check
      CHECK (user_type_conflict_policy IN ('skip', 'replace'));
  END IF;
END $$;


CREATE TABLE IF NOT EXISTS user_type_conflicts (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id     uuid NOT NULL,
  email          text NOT NULL,
  existing_role  text NOT NULL,             -- profiles.role at the time this was detected
  detected_role  text NOT NULL,             -- best-ranked candidate from the rules
  candidates     jsonb NOT NULL DEFAULT '[]',
  first_seen_at  timestamptz NOT NULL DEFAULT now(),
  last_seen_at   timestamptz NOT NULL DEFAULT now(),
  status         text NOT NULL DEFAULT 'pending', -- 'pending' | 'dismissed' | 'replaced'
  resolved_by    uuid,
  resolved_at    timestamptz,
  UNIQUE (profile_id, detected_role)
);

ALTER TABLE user_type_conflicts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS user_type_conflicts_read  ON user_type_conflicts;
DROP POLICY IF EXISTS user_type_conflicts_write ON user_type_conflicts;
CREATE POLICY user_type_conflicts_read  ON user_type_conflicts FOR SELECT USING (true);
CREATE POLICY user_type_conflicts_write ON user_type_conflicts FOR ALL   USING (true) WITH CHECK (true);

-- Verify:
-- SELECT user_type_conflict_policy FROM sync_settings LIMIT 1;
-- SELECT * FROM user_type_conflicts WHERE status = 'pending' ORDER BY last_seen_at DESC;
