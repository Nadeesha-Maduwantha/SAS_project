-- =============================================================================
-- Run this whole file once in the Supabase SQL editor. It's the combination
-- of 3 migrations, in the order they need to run:
--   1) user_types.sql                        — creates the user_types table
--   2) user_management_field_registry.sql     — field registry + assigned_emails
--   3) user_types_can_email_clients.sql       — adds the 3rd toggle column
-- All idempotent / safe to re-run.
-- =============================================================================

-- ── 1) user_types.sql ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_types (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key               text UNIQUE NOT NULL,
  label             text NOT NULL,
  description       text,
  field_table       text NOT NULL,
  field_column      text NOT NULL,
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

-- ── 2) user_management_field_registry.sql ───────────────────────────────────
ALTER TABLE shipments
  ADD COLUMN IF NOT EXISTS assigned_emails jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE field_definitions
  ADD COLUMN IF NOT EXISTS table_name  text NOT NULL DEFAULT 'shipments',
  ADD COLUMN IF NOT EXISTS usage       text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS value_shape text NOT NULL DEFAULT 'text';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'field_definitions_usage_check'
  ) THEN
    ALTER TABLE field_definitions
      ADD CONSTRAINT field_definitions_usage_check
      CHECK (usage IN ('milestones', 'user_management', 'none'));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'field_definitions_value_shape_check'
  ) THEN
    ALTER TABLE field_definitions
      ADD CONSTRAINT field_definitions_value_shape_check
      CHECK (value_shape IN ('text', 'email', 'jsonb_email_array'));
  END IF;
END $$;

INSERT INTO field_definitions (api_field, table_name, label, usage, value_shape)
VALUES
  ('sales_user_email', 'shipments',           'Sales user email',         'user_management', 'email'),
  ('created_by_email', 'shipments',           'Created-by email',         'user_management', 'email'),
  ('updated_by_email', 'shipments',           'Updated-by email',         'user_management', 'email'),
  ('assigned_email',   'shipment_milestones', 'Milestone assigned email', 'user_management', 'email'),
  ('assigned_emails',  'shipments',           'Assigned emails (list)',   'none',             'jsonb_email_array')
ON CONFLICT (api_field) DO NOTHING;

-- ── 3) user_types_can_email_clients.sql ─────────────────────────────────────
ALTER TABLE user_types
  ADD COLUMN IF NOT EXISTS can_email_clients boolean NOT NULL DEFAULT true;

-- ── Verify ───────────────────────────────────────────────────────────────────
-- SELECT key, label, field_table, field_column, can_request_cover, receive_alerts, can_email_clients, is_active FROM user_types;
-- SELECT api_field, table_name, usage, value_shape FROM field_definitions ORDER BY table_name, api_field;
-- SELECT id, assigned_emails FROM shipments LIMIT 5;
