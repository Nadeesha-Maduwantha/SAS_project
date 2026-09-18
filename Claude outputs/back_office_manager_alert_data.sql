-- =============================================================================
-- SAS — more test data, this time scoped to your new "Back office manager"
-- custom type (key: back_office_manager, sees via shipments.created_by_email).
-- Unlike the earlier "Finance User" test type (matched on the assigned_emails
-- jsonb list), this one matches a SINGLE email column, so each shipment below
-- is created_by ONE of the two test addresses, not both at once.
--
-- created_by_email was already seeded as usage='user_management' by the
-- original field registry migration, so no Usage flip is needed this time —
-- straight to sample shipments + alert-triggering milestones.
--
-- Assumption: these use the same two test emails as before
-- (systemcheck966@gmail.com, systemcheck747@gmail.com) — swap them below if
-- the Back office manager test account(s) you create use different emails.
-- Run once in the Supabase SQL editor.
-- =============================================================================

-- ── SAS-TEST-004 — created by systemcheck966, AIR ───────────────────────────
-- 3 milestones: one completed, one OVERDUE + CRITICAL, one DELAYED (out of
-- sequence) — a multi-alert shipment, which the alert feed sorts to the top.
INSERT INTO shipments (
  id, cargowise_id, job_number, origin_city, origin_country_code,
  destination_city, destination_country_code, current_stage, transport_mode,
  carrier, is_priority, transit_days, llm_identified_type,
  consignee_name, consignee_email,
  sales_user_name, sales_user_email,
  created_by_name, created_by_email, updated_by_name, updated_by_email,
  milestones, assigned_emails, created_at, updated_at
) VALUES (
  gen_random_uuid(), 'SAS-TEST-004', 'JOB-TEST-004', 'Colombo', 'LK',
  'Frankfurt', 'DE', 'Customs Clearance', 'AIR',
  'Test Air Cargo', true, 3, 'Customs Clearance',
  'Test Consignee 4', 'consignee4@example.com',
  'Test Sales Rep', 'testsales@example.com',
  'System Check', 'systemcheck966@gmail.com', 'System Check', 'systemcheck966@gmail.com',
  '{"cargo_pickup": {"cargo_pickup_date": "2026-09-08T09:00:00Z", "pickup_date_status": "On Time"}}'::jsonb,
  '[]'::jsonb,
  now() - interval '6 days', now() - interval '1 day'
);

-- ── SAS-TEST-005 — created by systemcheck747, SEA ───────────────────────────
-- 1 milestone: OVERDUE + CRITICAL — a clean single-alert case.
INSERT INTO shipments (
  id, cargowise_id, job_number, origin_city, origin_country_code,
  destination_city, destination_country_code, current_stage, transport_mode,
  carrier, is_priority, transit_days, llm_identified_type,
  consignee_name, consignee_email,
  sales_user_name, sales_user_email,
  created_by_name, created_by_email, updated_by_name, updated_by_email,
  milestones, assigned_emails, created_at, updated_at
) VALUES (
  gen_random_uuid(), 'SAS-TEST-005', 'JOB-TEST-005', 'Colombo', 'LK',
  'Rotterdam', 'NL', 'Documentation', 'SEA',
  'Test Ocean Line', true, 22, 'Documentation',
  'Test Consignee 5', 'consignee5@example.com',
  'Test Sales Rep', 'testsales@example.com',
  'System Check', 'systemcheck747@gmail.com', 'System Check', 'systemcheck747@gmail.com',
  '{"cargo_pickup": {"cargo_pickup_date": "2026-09-01T09:00:00Z", "pickup_date_status": "On Time"}}'::jsonb,
  '[]'::jsonb,
  now() - interval '9 days', now() - interval '1 day'
);

-- ── Milestones ────────────────────────────────────────────────────────────────
INSERT INTO shipment_milestones (
  id, shipment_id, sequence_order, name, milestone_type, status,
  is_critical, due_date, completed_date, notes, alert_sent, milestone_snapshot, created_at
)
SELECT gen_random_uuid(), s.id, 1, 'Cargo Pickup', 'date', 'completed',
       false, now() - interval '5 days', now() - interval '5 days', NULL, false, '{}'::jsonb, now() - interval '6 days'
FROM shipments s WHERE s.cargowise_id = 'SAS-TEST-004'
UNION ALL
SELECT gen_random_uuid(), s.id, 2, 'Customs Clearance', 'status', 'overdue',
       true, now() - interval '2 days', NULL, 'Customs docs still missing — overdue and critical.', false, '{}'::jsonb, now() - interval '4 days'
FROM shipments s WHERE s.cargowise_id = 'SAS-TEST-004'
UNION ALL
SELECT gen_random_uuid(), s.id, 3, 'Final Delivery', 'date', 'delayed',
       false, now() + interval '1 day', NULL, 'A later milestone already arrived out of sequence.', false, '{}'::jsonb, now() - interval '3 days'
FROM shipments s WHERE s.cargowise_id = 'SAS-TEST-004'
UNION ALL
SELECT gen_random_uuid(), s.id, 1, 'Documentation Check', 'status', 'overdue',
       true, now() - interval '3 days', NULL, 'Bill of lading not received — overdue and critical.', false, '{}'::jsonb, now() - interval '8 days'
FROM shipments s WHERE s.cargowise_id = 'SAS-TEST-005';

-- ── Verify ───────────────────────────────────────────────────────────────────
-- SELECT cargowise_id, created_by_email, transport_mode FROM shipments WHERE cargowise_id IN ('SAS-TEST-004','SAS-TEST-005');
-- SELECT s.cargowise_id, m.name, m.status, m.is_critical FROM shipment_milestones m
--   JOIN shipments s ON s.id = m.shipment_id WHERE s.cargowise_id IN ('SAS-TEST-004','SAS-TEST-005') ORDER BY 1, m.sequence_order;

-- ── Cleanup ───────────────────────────────────────────────────────────────────
-- DELETE FROM shipment_milestones WHERE shipment_id IN (SELECT id FROM shipments WHERE cargowise_id IN ('SAS-TEST-004','SAS-TEST-005'));
-- DELETE FROM shipments WHERE cargowise_id IN ('SAS-TEST-004','SAS-TEST-005');
