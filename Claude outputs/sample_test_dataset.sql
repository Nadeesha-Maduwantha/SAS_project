-- =============================================================================
-- SAS — sample test dataset for the Milestone Engine features built this
-- session (custom user types, field registry, cover access, the three
-- per-type toggles). Run once in the Supabase SQL editor, AFTER
-- run_these_in_order.sql (user_types / field registry / can_email_clients
-- migrations) has already been run.
--
-- This script does NOT create the two login accounts — those go through
-- Supabase Auth (sign-up), which only the app's Create User flow can do
-- safely. See the steps below the SQL.
-- =============================================================================

-- ── 1) Flip assigned_emails to "User management" ────────────────────────────
-- It already exists in field_definitions (seeded by the earlier migration at
-- usage='none') — this just turns it on. Equivalent to opening System
-- Settings -> User Types -> Field registry and changing its Usage dropdown
-- to "User management" and saving, if you'd rather click through it once.
UPDATE field_definitions
SET usage = 'user_management', value_shape = 'jsonb_email_array'
WHERE api_field = 'assigned_emails';

-- ── 2) Create one custom user type: "Finance User" ──────────────────────────
-- key is fixed here so it's predictable when creating the two accounts below
-- (the admin UI would slugify "Finance User" to this same key on its own).
INSERT INTO user_types (key, label, description, field_table, field_column,
                         can_request_cover, receive_alerts, can_email_clients, is_active)
VALUES ('finance_user', 'Finance User',
        'Test type — sees shipments where it is listed in assigned_emails.',
        'shipments', 'assigned_emails', true, false, true, true)
ON CONFLICT (key) DO UPDATE SET
  field_table = EXCLUDED.field_table, field_column = EXCLUDED.field_column,
  can_request_cover = EXCLUDED.can_request_cover, can_email_clients = EXCLUDED.can_email_clients,
  is_active = true;

-- ── 3) Three sample shipments ────────────────────────────────────────────────
-- SAS-TEST-001 — AIR, BOTH test users assigned (shared-visibility test).
-- SAS-TEST-002 — SEA, only systemcheck966 assigned (isolation test — 747
--                should NOT see this one).
-- SAS-TEST-003 — AIR, only systemcheck747 assigned, already delivered
--                (tests the "Delivered" stat + archived filtering).
INSERT INTO shipments (
  id, cargowise_id, job_number, origin_city, origin_country_code,
  destination_city, destination_country_code, current_stage, transport_mode,
  carrier, is_priority, transit_days, llm_identified_type,
  consignee_name, consignee_email,
  sales_user_name, sales_user_email,
  created_by_name, created_by_email, updated_by_name, updated_by_email,
  milestones, assigned_emails, created_at, updated_at
) VALUES
(
  gen_random_uuid(), 'SAS-TEST-001', 'JOB-TEST-001', 'Colombo', 'LK',
  'Singapore', 'SG', 'In Transit', 'AIR',
  'Test Air Cargo', true, 3, 'In Transit',
  'Test Consignee 1', 'consignee1@example.com',
  'Test Sales Rep', 'testsales@example.com',
  'System Check', 'systemcheck966@gmail.com', 'System Check', 'systemcheck966@gmail.com',
  '{"cargo_pickup": {"cargo_pickup_date": "2026-09-10T09:00:00Z", "pickup_date_status": "On Time"}}'::jsonb,
  '["systemcheck966@gmail.com", "systemcheck747@gmail.com"]'::jsonb,
  now() - interval '5 days', now() - interval '1 day'
),
(
  gen_random_uuid(), 'SAS-TEST-002', 'JOB-TEST-002', 'Colombo', 'LK',
  'Dubai', 'AE', 'Customs Clearance', 'SEA',
  'Test Ocean Line', false, 18, 'Customs Clearance',
  'Test Consignee 2', 'consignee2@example.com',
  'Test Sales Rep', 'testsales@example.com',
  'System Check', 'systemcheck966@gmail.com', 'System Check', 'systemcheck966@gmail.com',
  '{"cargo_pickup": {"cargo_pickup_date": "2026-09-05T09:00:00Z", "pickup_date_status": "Delayed"}}'::jsonb,
  '["systemcheck966@gmail.com"]'::jsonb,
  now() - interval '12 days', now() - interval '2 days'
),
(
  gen_random_uuid(), 'SAS-TEST-003', 'JOB-TEST-003', 'Colombo', 'LK',
  'London', 'GB', 'Delivered', 'AIR',
  'Test Air Cargo', false, 4, 'Delivered',
  'Test Consignee 3', 'consignee3@example.com',
  'Test Sales Rep', 'testsales@example.com',
  'System Check', 'systemcheck747@gmail.com', 'System Check', 'systemcheck747@gmail.com',
  '{"cargo_pickup": {"cargo_pickup_date": "2026-08-28T09:00:00Z", "pickup_date_status": "On Time"}}'::jsonb,
  '["systemcheck747@gmail.com"]'::jsonb,
  now() - interval '20 days', now() - interval '10 days'
);

-- ── 4) Milestones for each shipment ──────────────────────────────────────────
-- One overdue + critical (pins to the top of the alert feed), one delayed
-- (the lighter-red "out of sequence" case), one pending, and a fully
-- completed shipment.
INSERT INTO shipment_milestones (
  id, shipment_id, sequence_order, name, milestone_type, status,
  is_critical, due_date, completed_date, notes, alert_sent, milestone_snapshot, created_at
)
SELECT gen_random_uuid(), s.id, 1, 'Cargo Pickup', 'date', 'completed',
       false, now() - interval '4 days', now() - interval '4 days', 'Picked up on schedule.', false, '{}'::jsonb, now() - interval '5 days'
FROM shipments s WHERE s.cargowise_id = 'SAS-TEST-001'
UNION ALL
SELECT gen_random_uuid(), s.id, 2, 'Customs Clearance', 'status', 'overdue',
       true, now() - interval '1 day', NULL, 'Awaiting customs documents — overdue.', false, '{}'::jsonb, now() - interval '3 days'
FROM shipments s WHERE s.cargowise_id = 'SAS-TEST-001'
UNION ALL
SELECT gen_random_uuid(), s.id, 1, 'Cargo Pickup', 'date', 'delayed',
       false, now() + interval '2 days', NULL, 'Pickup delayed at origin.', false, '{}'::jsonb, now() - interval '11 days'
FROM shipments s WHERE s.cargowise_id = 'SAS-TEST-002'
UNION ALL
SELECT gen_random_uuid(), s.id, 2, 'Customs Clearance', 'status', 'pending',
       false, now() + interval '3 days', NULL, NULL, false, '{}'::jsonb, now() - interval '9 days'
FROM shipments s WHERE s.cargowise_id = 'SAS-TEST-002'
UNION ALL
SELECT gen_random_uuid(), s.id, 1, 'Cargo Pickup', 'date', 'completed',
       false, now() - interval '19 days', now() - interval '19 days', NULL, false, '{}'::jsonb, now() - interval '20 days'
FROM shipments s WHERE s.cargowise_id = 'SAS-TEST-003'
UNION ALL
SELECT gen_random_uuid(), s.id, 2, 'Delivered', 'date', 'completed',
       false, now() - interval '10 days', now() - interval '10 days', 'Delivered to consignee.', false, '{}'::jsonb, now() - interval '11 days'
FROM shipments s WHERE s.cargowise_id = 'SAS-TEST-003';

-- ── Verify ───────────────────────────────────────────────────────────────────
-- SELECT key, label, field_table, field_column FROM user_types WHERE key = 'finance_user';
-- SELECT cargowise_id, transport_mode, assigned_emails FROM shipments WHERE cargowise_id LIKE 'SAS-TEST-%';
-- SELECT s.cargowise_id, m.name, m.status, m.is_critical FROM shipment_milestones m
--   JOIN shipments s ON s.id = m.shipment_id WHERE s.cargowise_id LIKE 'SAS-TEST-%' ORDER BY 1, m.sequence_order;

-- ── Cleanup (when you're done testing) ───────────────────────────────────────
-- DELETE FROM shipment_milestones WHERE shipment_id IN (SELECT id FROM shipments WHERE cargowise_id LIKE 'SAS-TEST-%');
-- DELETE FROM shipments WHERE cargowise_id LIKE 'SAS-TEST-%';
-- DELETE FROM user_types WHERE key = 'finance_user';
-- (Deactivate is safer than deleting user_types if either test account still
--  references the role — use is_active = false instead if you're keeping the accounts.)
