-- =============================================================================
-- SAS — Field definitions (admin-editable meanings for data fields)
-- Run once in the Supabase SQL editor. Choose "Run and enable RLS" if prompted.
-- =============================================================================

CREATE TABLE IF NOT EXISTS field_definitions (
  api_field   text PRIMARY KEY,      -- e.g. 'cargo_pickup_date'
  label       text,                  -- optional friendly name
  definition  text,                  -- what this field means
  updated_at  timestamptz NOT NULL DEFAULT now(),
  updated_by  uuid
);

ALTER TABLE field_definitions ENABLE ROW LEVEL SECURITY;

-- The backend uses the anon key and enforces admin access itself, so allow the
-- anon/authenticated role through (matches how milestone_field_map is set up).
DROP POLICY IF EXISTS field_definitions_read  ON field_definitions;
DROP POLICY IF EXISTS field_definitions_write ON field_definitions;
CREATE POLICY field_definitions_read  ON field_definitions FOR SELECT USING (true);
CREATE POLICY field_definitions_write ON field_definitions FOR ALL   USING (true) WITH CHECK (true);
