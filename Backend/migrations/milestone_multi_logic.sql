-- =============================================================================
-- SAS — Multi-logic milestones
-- Lets one milestone combine several checks (e.g. cargo pickup date updated AND
-- pickup status = "Completed"). The primary check stays in the existing flat
-- columns; extra checks live in extra_logics, combined via logic_combine.
-- Run once in the Supabase SQL editor.
-- =============================================================================

ALTER TABLE milestone_library
  ADD COLUMN IF NOT EXISTS extra_logics  jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS logic_combine text  DEFAULT 'and';
