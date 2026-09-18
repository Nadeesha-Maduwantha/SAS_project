-- =============================================================================
-- Puts ONE brand-new, never-seen-before email into a "User management" field
-- (shipments.created_by_email) so the next scan finds it as genuinely NEW —
-- that's what makes it queue into Suggested Accounts / User Registry AND
-- trigger the email + dashboard-bell alert (re-using an email that's already
-- been scanned once just refreshes last_seen_at — no new alert, by design,
-- so it doesn't re-email you every 30 minutes for the same person).
--
-- After running this, either:
--   • wait for the next scheduled scan (:10 / :40 past the hour), or
--   • go to Admin -> User Management -> User Registry (or System Settings ->
--     User Type Rules) and click "Scan now" to trigger it immediately.
--
-- Needs a recipient configured first: System Settings -> User account
-- alerts -> "New user account created" (or sync_settings.admin_emails as a
-- fallback) — otherwise the scan will queue the suggestion but has nobody
-- to email.
-- =============================================================================

INSERT INTO shipments (
  id, cargowise_id, job_number, origin_city, origin_country_code,
  destination_city, destination_country_code, current_stage, transport_mode,
  carrier, is_priority, transit_days, llm_identified_type,
  consignee_name, consignee_email,
  sales_user_name, sales_user_email,
  created_by_name, created_by_email, updated_by_name, updated_by_email,
  milestones, assigned_emails, created_at, updated_at
) VALUES (
  gen_random_uuid(), 'SAS-TEST-006', 'JOB-TEST-006', 'Colombo', 'LK',
  'Hamburg', 'DE', 'Booking Confirmed', 'SEA',
  'Test Ocean Line', false, 20, 'Booking Confirmed',
  'Test Consignee 6', 'consignee6@example.com',
  'Test Sales Rep', 'testsales@example.com',
  'System Check', 'newhire.test1@example.com', 'System Check', 'newhire.test1@example.com',
  '{"cargo_pickup": {"cargo_pickup_date": "2026-09-20T09:00:00Z", "pickup_date_status": "On Time"}}'::jsonb,
  '[]'::jsonb,
  now(), now()
);

-- ── Verify it's queued (after the scan runs) ────────────────────────────────
-- SELECT email, detected_role, status, first_seen_at FROM suggested_user_accounts
--   WHERE email = 'newhire.test1@example.com';

-- ── Cleanup when you're done testing ────────────────────────────────────────
-- DELETE FROM shipments WHERE cargowise_id = 'SAS-TEST-006';
-- DELETE FROM suggested_user_accounts WHERE email = 'newhire.test1@example.com';
