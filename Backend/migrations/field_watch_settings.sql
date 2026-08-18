-- =============================================================================
-- SAS — Field Watch module: its own admin recipient (separate from the
-- milestone-name-mismatch recipient). Run once in the Supabase SQL editor.
-- =============================================================================

ALTER TABLE sync_settings
  ADD COLUMN IF NOT EXISTS field_watch_alert_email text,
  ADD COLUMN IF NOT EXISTS field_watch_alert_on    boolean DEFAULT true;
