-- =============================================================================
-- Diagnostic — run each block in the Supabase SQL editor and see which one
-- comes back empty/off. That tells us exactly where the alert is dying.
-- =============================================================================

-- 1) Did the migrations actually run? (columns should exist and have values)
SELECT notify_new_user_created, notify_user_account_suggested
FROM security_settings_general WHERE id = 1;

SELECT new_user_alert_email, new_user_alert_on, admin_emails
FROM sync_settings LIMIT 1;

-- 2) Is there anyone to email at all? If both columns above are null/empty,
--    _new_user_alert_emails() has nobody to send to and silently no-ops.
--    (Set one via System Settings -> User account alerts -> "New user
--     account created", or fill in admin_emails as a fallback.)

-- 3) Did the account creations even get logged? (confirms create_user()
--    ran your patched code, not a stale process — see note below)
SELECT audit_id, created_at, description, new_value
FROM audit_trail
WHERE action_type_id = 1 AND entity_type_id = 2
ORDER BY created_at DESC
LIMIT 5;

-- If this is EMPTY even though you just created 2 users, the backend that
-- handled the request is running the OLD code (Flask's reloader is off in
-- this project — app.run(..., use_reloader=False) — so file edits don't
-- take effect until you stop and restart it). Restart the Flask server and
-- try again before digging further.
