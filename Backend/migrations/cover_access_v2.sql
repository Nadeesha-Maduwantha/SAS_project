-- =============================================================================
-- Cover Access v2 — admin/super direct grants + extension (red-window) flow.
-- Run AFTER cover_access.sql, once, in the Supabase SQL editor. Idempotent.
-- =============================================================================

ALTER TABLE cover_requests
    -- 'request' = op/sales, owner approves.  'direct' = admin/super self-grant.
    ADD COLUMN IF NOT EXISTS grant_type    text    NOT NULL DEFAULT 'request',
    -- Extension (re-request during the 3h red window): requester proposes hours,
    -- owner accepts or overrides. Activates without a new code.
    ADD COLUMN IF NOT EXISTS is_extension  boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS proposed_hours integer,
    ADD COLUMN IF NOT EXISTS parent_id     uuid;
