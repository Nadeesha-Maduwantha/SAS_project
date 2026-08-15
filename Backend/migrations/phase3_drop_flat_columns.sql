-- =============================================================================
-- SAS — Phase 3: drop the old flat shipment columns
-- Run ONLY after the dual-write is removed from app.py + routes/sync.py and the
-- backend has been restarted. Data now lives in shipments.milestones + raw_json.
--
-- POINT OF NO RETURN. Shared DB — coordinate with the team before running.
-- =============================================================================

ALTER TABLE shipments
  DROP COLUMN IF EXISTS cargo_ready_date,
  DROP COLUMN IF EXISTS cargo_pickup_date,
  DROP COLUMN IF EXISTS pickup_date_status;
