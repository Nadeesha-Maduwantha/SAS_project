-- =============================================================================
-- Per-rule fire condition: let an alert rule check a specific field.
-- Used when condition = 'if_comparison_true' — the rule fires only while
-- (condition_field  condition_operator  condition_value) holds true.
-- Run once in the Supabase SQL editor.
-- =============================================================================

ALTER TABLE milestone_alert_rules
  ADD COLUMN IF NOT EXISTS condition_field    text,
  ADD COLUMN IF NOT EXISTS condition_operator text,
  ADD COLUMN IF NOT EXISTS condition_value    text;
