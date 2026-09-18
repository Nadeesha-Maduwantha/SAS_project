-- =============================================================================
-- SAS — User Type Rules: admin-configurable "how do we know someone's role"
-- registry, mirroring the milestone field-registry pattern (field_definitions /
-- milestone_field_map) but for role identification instead of milestone fields.
--
-- user_type_rules — one row per "this table.column identifies this role" rule.
--   Multiple rules per role are allowed (any match qualifies) — e.g. a sales
--   user might be identifiable via shipments.sales_user_email AND, later, some
--   other column an admin adds. `table_name`/`column_name` are admin-editable
--   through the UI, but the backend only ever queries a small, code-defined
--   allowlist of tables (see services/user_type_rules.py ALLOWED_TABLES) —
--   this keeps "which field identifies a role" genuinely dynamic/admin-owned
--   without letting the registry be pointed at an arbitrary table.
--
-- suggested_user_accounts — queue of emails the scheduled scan found in
-- shipment data with no matching profiles.email, along with the role the
-- rules above detected for them. An admin reviews/dismisses/creates from here
-- (System Settings -> User Type Rules) rather than accounts being silently
-- auto-created — CargoWise sync has no password to hand a new login anyway.
--
-- Run once in the Supabase SQL editor. Idempotent.
-- =============================================================================

CREATE TABLE IF NOT EXISTS user_type_rules (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role         text NOT NULL,              -- matches profiles.role spelling: 'admin' | 'superuser' | 'operationuser' | 'salesuser'
  table_name   text NOT NULL,              -- e.g. 'shipments'
  column_name  text NOT NULL,              -- e.g. 'sales_user_email'
  description  text,                       -- optional admin note shown in the UI
  priority     integer NOT NULL DEFAULT 0, -- lower checked first; used to rank multiple candidate roles
  is_active    boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  updated_by   uuid,
  UNIQUE (role, table_name, column_name)
);

ALTER TABLE user_type_rules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS user_type_rules_read  ON user_type_rules;
DROP POLICY IF EXISTS user_type_rules_write ON user_type_rules;
CREATE POLICY user_type_rules_read  ON user_type_rules FOR SELECT USING (true);
CREATE POLICY user_type_rules_write ON user_type_rules FOR ALL   USING (true) WITH CHECK (true);

-- Seed with the identification rules already implicitly hardcoded in
-- services/scope.py's allowed_shipment_ids() — so nothing about who gets
-- auto-detected as what changes until an admin edits/adds rules.
INSERT INTO user_type_rules (role, table_name, column_name, description, priority)
SELECT * FROM (VALUES
  ('salesuser',     'shipments',           'sales_user_email', 'Owns the shipment as the assigned sales rep (matches services/scope.py)', 0),
  ('operationuser', 'shipment_milestones', 'assigned_email',   'Assigned to action a milestone on the shipment (matches services/scope.py)', 0)
) AS v(role, table_name, column_name, description, priority)
WHERE NOT EXISTS (
  SELECT 1 FROM user_type_rules r
  WHERE r.role = v.role AND r.table_name = v.table_name AND r.column_name = v.column_name
);


CREATE TABLE IF NOT EXISTS suggested_user_accounts (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email          text NOT NULL UNIQUE,
  detected_role  text,                          -- best-ranked candidate, or null if ambiguous/none
  candidates     jsonb NOT NULL DEFAULT '[]',    -- [{role, table_name, column_name, priority}, ...] every rule that matched
  first_seen_at  timestamptz NOT NULL DEFAULT now(),
  last_seen_at   timestamptz NOT NULL DEFAULT now(),
  status         text NOT NULL DEFAULT 'pending', -- 'pending' | 'dismissed' | 'created'
  dismissed_by   uuid,
  dismissed_at   timestamptz,
  created_user_id uuid                            -- set once an admin creates the account from this suggestion
);

ALTER TABLE suggested_user_accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS suggested_user_accounts_read  ON suggested_user_accounts;
DROP POLICY IF EXISTS suggested_user_accounts_write ON suggested_user_accounts;
CREATE POLICY suggested_user_accounts_read  ON suggested_user_accounts FOR SELECT USING (true);
CREATE POLICY suggested_user_accounts_write ON suggested_user_accounts FOR ALL   USING (true) WITH CHECK (true);

-- Verify:
-- SELECT * FROM user_type_rules ORDER BY role, priority;
-- SELECT * FROM suggested_user_accounts WHERE status = 'pending' ORDER BY last_seen_at DESC;
