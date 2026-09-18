-- =============================================================================
-- New user created -> admin alert (email + in-app "Security Notifications"
-- bell). Two independent settings:
--   1) security_settings_general.notify_new_user_created — whether it shows
--      up in the top-bar bell (Security Settings -> Security Notifications),
--      same convention as the other 4 toggles there.
--   2) sync_settings.new_user_alert_email / new_user_alert_on — which admin
--      gets the EMAIL, same convention as mismatch_alert_email /
--      field_watch_alert_email (System Settings page). Falls back to the
--      general admin_emails list when unset.
-- Idempotent / safe to re-run.
-- =============================================================================

ALTER TABLE security_settings_general
  ADD COLUMN IF NOT EXISTS notify_new_user_created boolean NOT NULL DEFAULT true;

ALTER TABLE sync_settings
  ADD COLUMN IF NOT EXISTS new_user_alert_email text,
  ADD COLUMN IF NOT EXISTS new_user_alert_on boolean NOT NULL DEFAULT true;

-- ── Verify ───────────────────────────────────────────────────────────────────
-- SELECT notify_new_user_created FROM security_settings_general WHERE id = 1;
-- SELECT new_user_alert_email, new_user_alert_on, admin_emails FROM sync_settings LIMIT 1;
