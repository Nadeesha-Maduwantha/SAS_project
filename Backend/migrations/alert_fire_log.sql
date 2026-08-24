-- =============================================================================
-- SAS — Alert engine fire log
-- One row per (milestone, alert rule, scheduled occurrence). This is what makes
-- the engine idempotent: a scheduled pass never re-sends an occurrence that is
-- already recorded here, so the job can run as often as you like.
--
-- `watch_value` stores the stop-condition watch field's value at the first fire,
-- which is what the "Changes" stop condition compares against later.
--
-- Run once in the Supabase SQL editor, after milestone_multi_logic.sql.
-- =============================================================================

CREATE TABLE IF NOT EXISTS alert_fire_log (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_milestone_id uuid        NOT NULL REFERENCES shipment_milestones(id),
  shipment_id           uuid,
  rule_index            integer     NOT NULL DEFAULT 0,
  occurrence            integer     NOT NULL DEFAULT 0,
  due_date              date,
  condition             text,
  recipient_type        text,
  recipient_email       text,
  subject               text,
  -- sent | skipped | stopped | no_recipient | failed
  status                text        NOT NULL DEFAULT 'sent',
  error                 text,
  watch_value           text,
  fired_at              timestamptz NOT NULL DEFAULT now(),
  created_at            timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT alert_fire_log_occurrence_unique
    UNIQUE (shipment_milestone_id, rule_index, occurrence)
);

-- Keep upgrades safe when the table was created by an earlier version.
ALTER TABLE alert_fire_log
  ADD COLUMN IF NOT EXISTS condition text;

CREATE INDEX IF NOT EXISTS alert_fire_log_milestone_idx
  ON alert_fire_log (shipment_milestone_id);
CREATE INDEX IF NOT EXISTS alert_fire_log_shipment_idx
  ON alert_fire_log (shipment_id);
CREATE INDEX IF NOT EXISTS alert_fire_log_fired_at_idx
  ON alert_fire_log (fired_at DESC);

ALTER TABLE alert_fire_log ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'alert_fire_log' AND policyname = 'alert_fire_log_service_all'
  ) THEN
    CREATE POLICY alert_fire_log_service_all ON alert_fire_log
      FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
