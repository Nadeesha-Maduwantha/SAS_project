-- =============================================================================
-- SAS — TEST DATA for the ALERT EMAILS (re-runnable).
--
-- Seeds a guaranteed field-naming mismatch so both email streams can be tested:
--   • Milestone field mismatch  → notify_admins  (recipient: mismatch_alert_email)
--       fires from POST /api/field-map/detect  (or the :15 scheduled job)
--   • Field Watch delayed/renamed → _notify      (recipient: field_watch_alert_email)
--       fires from GET  /api/field-watch/scan
--
-- How it works: we register two "expected" fields the CargoWise feed does NOT
-- send (first_transit_date, cargo_pickup_confirmed), and give three shipments a
-- raw_json that carries the RENAMED look-alikes (first_transit_dt,
-- cargo_pickup_confirm). The detector sees the expected field is missing, finds
-- the look-alike, and flags a mismatch → email.
--
-- AFTER RUNNING:
--   1) System Settings → set a recipient for each alert and toggle it ON.
--   2) Restart Flask (so Backend/.env SMTP + this data are both live).
--   3) Field Registry → "Run mismatch check" (emails the mismatch digest),
--      and/or "Rescan" (emails the Field Watch digest).
-- =============================================================================

-- 1) Register two expected fields the feed doesn't provide (look-alikes exist).
INSERT INTO milestone_field_map (milestone_key, api_field, source, is_active)
VALUES
  ('test_transit_check', 'first_transit_date',     'predefined', true),
  ('test_pickup_check',  'cargo_pickup_confirmed',  'predefined', true)
ON CONFLICT (milestone_key, api_field) DO UPDATE SET is_active = true;

-- 2) Three shipments whose raw_json carries the RENAMED look-alikes.
INSERT INTO shipments
  (id, cargowise_id, job_number, transport_mode, branch, st_description, current_stage,
   consignee_name, created_by_name, created_by_email, raw_json, milestones, created_at, updated_at)
VALUES
 ('ee000000-0000-0000-0000-0000000000e1','EML-A','EML-A','SEA','CMB',
  'Import Delivery Instructions','Import Delivery Instructions','Email Test A','Test Ops','testops@example.com',
  '{"job_number":"EML-A","first_transit_dt":"2025-08-01","cargo_pickup_confirm":"2025-08-02","oh_full_name":"Test Ops"}'::jsonb,
  '{}'::jsonb, now() - interval '30 days', now()),
 ('ee000000-0000-0000-0000-0000000000e2','EML-B','EML-B','AIR','CMB',
  'Import Delivery Instructions','Import Delivery Instructions','Email Test B','Test Ops','testops@example.com',
  '{"job_number":"EML-B","first_transit_dt":"2025-08-03","oh_full_name":"Test Ops"}'::jsonb,
  '{}'::jsonb, now() - interval '20 days', now()),
 ('ee000000-0000-0000-0000-0000000000e3','EML-C','EML-C','SEA','CMB',
  'Import Delivery Instructions','Import Delivery Instructions','Email Test C','Test Ops','testops@example.com',
  '{"job_number":"EML-C","cargo_pickup_confirm":"2025-08-05","oh_full_name":"Test Ops"}'::jsonb,
  '{}'::jsonb, now() - interval '10 days', now())
ON CONFLICT (id) DO UPDATE SET
  raw_json   = EXCLUDED.raw_json,
  updated_at = now();

-- 3) Clear the "already emailed" markers so the digest re-sends on demand.
--    (Both streams are new-only; without this they won't re-email.)
DELETE FROM sync_errors WHERE job_number LIKE '[field-map]%'
                           OR job_number LIKE '[field-delayed]%';
