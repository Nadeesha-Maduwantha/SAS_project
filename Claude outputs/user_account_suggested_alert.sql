-- =============================================================================
-- "New email in a user-management field, no account yet" admin alert.
--
-- The scan job (services/user_type_rules.py scan_for_unmatched_people, every
-- :10/:40 past the hour) already queues these into suggested_user_accounts
-- for review under System Settings -> User Type Rules. This migration adds
-- the missing alert on top of that existing queue:
--   • EMAIL — reuses sync_settings.new_user_alert_email / new_user_alert_on
--     (already added by migrations/new_user_alerts.sql — run that one first
--     if you haven't). No new columns needed for the email half.
--   • Bell — security_settings_general.notify_user_account_suggested, same
--     convention as the other Security Notifications toggles.
-- Idempotent / safe to re-run.
-- =============================================================================

ALTER TABLE security_settings_general
  ADD COLUMN IF NOT EXISTS notify_user_account_suggested boolean NOT NULL DEFAULT true;

-- ── Verify ───────────────────────────────────────────────────────────────────
-- SELECT notify_user_account_suggested FROM security_settings_general WHERE id = 1;
