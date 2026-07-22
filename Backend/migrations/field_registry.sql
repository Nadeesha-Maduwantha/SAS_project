-- =============================================================================
-- SAS — Field Registry integration (Ronaka side)
-- Run once in the Supabase SQL editor. Safe to re-run (all IF NOT EXISTS / guarded).
-- =============================================================================

-- 1. milestone_key on milestone_library
--    A stable registry key per milestone, generated once and never changed on
--    rename. The builder now writes this on create; this backfills existing rows.
ALTER TABLE milestone_library
  ADD COLUMN IF NOT EXISTS milestone_key text;

UPDATE milestone_library
SET milestone_key =
      btrim(regexp_replace(lower(coalesce(name, 'milestone')), '[^a-z0-9]+', '_', 'g'), '_')
      || '_' || left(replace(id::text, '-', ''), 6)
WHERE milestone_key IS NULL;

CREATE INDEX IF NOT EXISTS idx_milestone_library_key
  ON milestone_library (milestone_key);

-- 2. milestone_field_map — Isiri ALREADY created this (with RLS + policies), so
--    it is intentionally NOT created here. Running a CREATE TABLE triggers
--    Supabase's "table without RLS" warning for no reason.
--    If your merge somehow didn't bring the table across, uncomment the block
--    below AND add RLS policies afterwards (or use "Run and enable RLS"):
--
-- CREATE TABLE IF NOT EXISTS milestone_field_map (
--   id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
--   milestone_key text NOT NULL,
--   api_field     text NOT NULL,
--   source        text NOT NULL DEFAULT 'predefined',
--   is_active     boolean NOT NULL DEFAULT true,
--   created_at    timestamptz NOT NULL DEFAULT now(),
--   UNIQUE (milestone_key, api_field)
-- );
-- ALTER TABLE milestone_field_map ENABLE ROW LEVEL SECURITY;

-- 3. Milestone name-mismatch alert recipient (System Settings -> Milestone settings).
--    field_registry.notify_admins() prefers this over admin_emails, and only
--    emails when alert_on_validation is true.
ALTER TABLE sync_settings
  ADD COLUMN IF NOT EXISTS mismatch_alert_email text;

-- Make sure a settings row exists so the System Settings page can save to it.
INSERT INTO sync_settings (schedule_hours, schedule_minute)
SELECT '0,6,12,18', 0
WHERE NOT EXISTS (SELECT 1 FROM sync_settings);

-- Verify:
-- SELECT milestone_key, name FROM milestone_library ORDER BY created_at DESC LIMIT 10;
-- SELECT * FROM milestone_field_map ORDER BY milestone_key;
