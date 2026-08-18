-- =============================================================================
-- SAS — "expected data field delayed / possibly renamed" alerts
-- Adds a per-milestone field_alert holding the yellow-card detail (or null).
-- Run once in the Supabase SQL editor.
-- =============================================================================

ALTER TABLE shipment_milestones
  ADD COLUMN IF NOT EXISTS field_alert jsonb;
