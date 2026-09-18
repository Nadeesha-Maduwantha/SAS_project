-- =============================================================================
-- SAS — admin-defined custom user types (a 5th+ role beyond the fixed 4:
-- admin/superuser/salesuser/operationuser, which stay hardcoded and unchanged).
--
-- A custom type behaves like Operation/Sales: its users see only the shipments
-- (and their milestones) where they're identified via field_table.field_column
-- — the same field-registry column picker System Settings -> User Type Rules
-- already uses (a column flagged usage='user_management' in field_definitions;
-- see services/user_type_rules.py's list_allowed_tables()). Admin also
-- toggles, per type:
--   can_request_cover — whether users of this type can use the Cover Access
--                       request flow with OTHER users of the same type
--                       (mirrors how operation covers operation).
--   receive_alerts    — whether they're included in an automatic milestone
--                       alert digest email, or have to check the dashboard
--                       themselves. Defaults OFF: as of this migration there
--                       is no generic digest sender wired up for custom
--                       types yet (operations_digest.py / sales_digest.py are
--                       still role-specific) — turning this on is a flag for
--                       a future digest-engine generalization, not yet a
--                       working alert path. See System Settings -> User
--                       Types for the in-app caveat.
--
-- Deletion is a soft is_active=false (never hard-delete) — profiles.role can
-- already hold a type's key, and hard-deleting the type would strand those
-- accounts with a role no longer defined anywhere.
--
-- Run once in the Supabase SQL editor. Idempotent.
-- =============================================================================

CREATE TABLE IF NOT EXISTS user_types (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key               text UNIQUE NOT NULL,   -- stored in profiles.role, e.g. 'finance_user'
  label             text NOT NULL,          -- e.g. 'Finance User'
  description       text,
  field_table       text NOT NULL,          -- 'shipments' | 'shipment_milestones'
  field_column      text NOT NULL,          -- a column flagged usage='user_management'
  can_request_cover boolean NOT NULL DEFAULT true,
  receive_alerts    boolean NOT NULL DEFAULT false,
  is_active         boolean NOT NULL DEFAULT true,
  created_by        uuid,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE user_types ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS user_types_read  ON user_types;
DROP POLICY IF EXISTS user_types_write ON user_types;
CREATE POLICY user_types_read  ON user_types FOR SELECT USING (true);
CREATE POLICY user_types_write ON user_types FOR ALL   USING (true) WITH CHECK (true);

-- Verify:
-- SELECT key, label, field_table, field_column, can_request_cover, receive_alerts, is_active FROM user_types;
