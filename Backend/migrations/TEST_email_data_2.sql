-- =============================================================================
-- SAS — TEST DATA #2 for the mismatch email (re-runnable).
--
-- Fresh mismatches with NEW field names (so they don't collide with anything you
-- already resolved). Registers two expected fields the feed doesn't send, and
-- gives shipments a raw_json carrying the RENAMED look-alikes:
--     customs_cleared_date   ← look-alike  customs_clearance_dt
--     vessel_arrival_date    ← look-alike  vessel_arrived_dt
--
-- AFTER RUNNING → System Settings → "Run check & email now".
-- =============================================================================

-- 1) Register two expected fields the CargoWise feed does NOT provide.
INSERT INTO milestone_field_map (milestone_key, api_field, source, is_active)
VALUES
  ('test_customs_check', 'customs_cleared_date', 'predefined', true),
  ('test_arrival_check', 'vessel_arrival_date',  'predefined', true)
ON CONFLICT (milestone_key, api_field) DO UPDATE SET is_active = true;

-- 2) Shipments whose raw_json carries the RENAMED look-alikes.
INSERT INTO shipments
  (id, cargowise_id, job_number, transport_mode, branch, st_description, current_stage,
   consignee_name, created_by_name, created_by_email, raw_json, milestones, created_at, updated_at)
VALUES
 ('ee000000-0000-0000-0000-0000000000f1','EML-D','EML-D','SEA','CMB',
  'Import Delivery Instructions','Import Delivery Instructions','Email Test D','Test Ops','testops@example.com',
  '{"job_number":"EML-D","customs_clearance_dt":"2025-08-06","vessel_arrived_dt":"2025-08-07","oh_full_name":"Test Ops"}'::jsonb,
  '{}'::jsonb, now() - interval '25 days', now()),
 ('ee000000-0000-0000-0000-0000000000f2','EML-E','EML-E','AIR','CMB',
  'Import Delivery Instructions','Import Delivery Instructions','Email Test E','Test Ops','testops@example.com',
  '{"job_number":"EML-E","customs_clearance_dt":"2025-08-08","oh_full_name":"Test Ops"}'::jsonb,
  '{}'::jsonb, now() - interval '15 days', now())
ON CONFLICT (id) DO UPDATE SET
  raw_json   = EXCLUDED.raw_json,
  updated_at = now();

-- 3) Clear the "already emailed" markers so the digest re-sends.
DELETE FROM sync_errors WHERE job_number LIKE '[field-map]%'
                           OR job_number LIKE '[field-delayed]%';
