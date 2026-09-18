-- =============================================================================
-- SAS — shared field registry: let any shipment/milestone field be flagged
-- for use in Milestones, User Management (role identification), or neither
-- ("none" = registered but not wired to any feature yet — "allocate later").
--
-- Builds on field_definitions (already the admin-editable "meanings" table
-- surfaced in the Milestone Builder's FieldSelector) instead of inventing a
-- second, disconnected registry just for User Type Rules. Manage it in
-- System Settings -> Milestone settings -> Field meanings: each field there
-- now also gets a "Usage" (Milestones / User management / None) and, when
-- Usage = User management, a "Value shape" (Single email / List of emails).
--
-- Also adds shipments.assigned_emails — a jsonb array of emails, the first
-- field meant to hold MULTIPLE people rather than one. It's seeded with
-- usage='none' so nothing changes until an admin explicitly turns it on.
--
-- Run once in the Supabase SQL editor. Idempotent.
-- =============================================================================

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

-- Seed the columns User Type Rules already relied on (hardcoded before this
-- migration, in services/user_type_rules.py's ALLOWED_TABLES) so existing
-- rules keep working unchanged, plus register the new assigned_emails field
-- at usage='none' — pick its real usage in the Field meanings screen.
INSERT INTO field_definitions (api_field, table_name, label, usage, value_shape)
VALUES
  ('sales_user_email', 'shipments',           'Sales user email',         'user_management', 'email'),
  ('created_by_email', 'shipments',           'Created-by email',         'user_management', 'email'),
  ('updated_by_email', 'shipments',           'Updated-by email',         'user_management', 'email'),
  ('assigned_email',   'shipment_milestones', 'Milestone assigned email', 'user_management', 'email'),
  ('assigned_emails',  'shipments',           'Assigned emails (list)',   'none',             'jsonb_email_array')
ON CONFLICT (api_field) DO NOTHING;

-- Verify:
-- SELECT api_field, table_name, usage, value_shape FROM field_definitions ORDER BY table_name, api_field;
-- SELECT id, assigned_emails FROM shipments LIMIT 5;
