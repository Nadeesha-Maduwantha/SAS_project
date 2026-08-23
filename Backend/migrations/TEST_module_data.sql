-- =============================================================================
-- SAS — TEST DATA for verifying the modules (re-runnable).
-- Creates 2 controlled shipments that exercise: milestone status (overdue /
-- completed), Field Watch (missing / out-of-sequence / possible rename), and the
-- naming-mismatch detector. Assign your TEST template to these two, then run the
-- scans (see the test steps).
--
-- Fields used resolve via surviving shipment columns (cargo_received_date,
-- delivery_date) so the result is deterministic. 'first_transit_date' is an
-- EXPECTED/future field with no column → always missing, and raw_json carries a
-- lookalike 'first_transit_dt' to trigger the rename suggestion + mismatch.
-- =============================================================================

INSERT INTO shipments
  (id, cargowise_id, job_number, transport_mode, branch, st_description, current_stage,
   consignee_name, created_by_name, created_by_email,
   cargo_received_date, delivery_date, raw_json, milestones, created_at, updated_at)
VALUES
-- 1) TST-A — OLD: received & transit missing, delivery already arrived
--    → M1/M2 overdue + out-of-sequence; first_transit_date → "first_transit_dt"
('ff000000-0000-0000-0000-0000000000a1', 'TST-A', 'TST-A', 'SEA', 'CMB',
 'Import Delivery Instructions', 'Import Delivery Instructions',
 'Test Consignee A', 'Test Ops', 'testops@example.com',
 NULL, now() - interval '40 days',
 '{"job_number":"TST-A","transport_mode":"SEA","st_description":"Import Delivery Instructions","branch":"CMB","oh_full_name":"Test Ops","first_transit_dt":"2025-08-05","some_new_api_field":"x"}'::jsonb,
 '{}'::jsonb,
 now() - interval '45 days', now() - interval '45 days'),

-- 2) TST-B — RECENT: received + delivery present → M1/M3 completed;
--    M2 (expected field) still missing while M3 arrived → out-of-sequence only
('ff000000-0000-0000-0000-0000000000a2', 'TST-B', 'TST-B', 'AIR', 'CMB',
 'Import Delivery Instructions', 'Import Delivery Instructions',
 'Test Consignee B', 'Test Ops', 'testops@example.com',
 now() - interval '2 days', now() - interval '1 days',
 '{"job_number":"TST-B","transport_mode":"AIR","st_description":"Import Delivery Instructions","branch":"CMB","oh_full_name":"Test Ops"}'::jsonb,
 '{}'::jsonb,
 now() - interval '5 days', now() - interval '5 days')

ON CONFLICT (id) DO UPDATE SET
  cargo_received_date = EXCLUDED.cargo_received_date,
  delivery_date       = EXCLUDED.delivery_date,
  raw_json            = EXCLUDED.raw_json,
  st_description       = EXCLUDED.st_description,
  created_by_email     = EXCLUDED.created_by_email,
  created_at           = EXCLUDED.created_at;

-- To re-test the EMAILS (they're new-only), clear the sent markers first:
--   DELETE FROM sync_errors WHERE job_number LIKE '[field-delayed]%'
--                              OR job_number LIKE '[field-map]%';
