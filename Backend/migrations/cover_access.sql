-- =============================================================================
-- Cover Access — let a colleague temporarily see & act on an absent teammate's
-- work (same department only), time-boxed and code-gated, with an activity log
-- so the owner gets a report of what was done. Run once in the Supabase SQL editor.
-- =============================================================================

-- ── Requests / grants ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cover_requests (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Who is asking, and whose work they want.
    requester_email text NOT NULL,
    requester_name  text,
    owner_email     text NOT NULL,
    owner_name      text,
    department      text,                    -- must match; enforced in code
    reason          text,

    -- Lifecycle: pending -> approved -> active -> ended | rejected | revoked
    status          text NOT NULL DEFAULT 'pending',

    -- What the stand-in may do (fixed to 'act' for now; kept for future 'view').
    access_level    text NOT NULL DEFAULT 'act',

    -- Chosen by the approver at approval time.
    duration_hours  integer,
    approved_by     text,                    -- owner email, or an admin (override)
    approved_at     timestamptz,

    -- One-time code, stored hashed. Cleared once activated.
    code_hash       text,
    activated_at    timestamptz,             -- set when the code is verified
    expires_at      timestamptz,             -- activated_at + duration

    revoked_at      timestamptz,
    revoked_by      text,

    -- Set once the end-of-period report has been sent (idempotent job guard).
    report_sent_at  timestamptz,

    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cover_owner     ON cover_requests (owner_email, status);
CREATE INDEX IF NOT EXISTS idx_cover_requester ON cover_requests (requester_email, status);
CREATE INDEX IF NOT EXISTS idx_cover_expires   ON cover_requests (status, expires_at);

-- ── Activity log — what the stand-in did on the owner's work ──────────────────
CREATE TABLE IF NOT EXISTS cover_activity_log (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id     uuid NOT NULL REFERENCES cover_requests (id) ON DELETE CASCADE,
    actor_email    text NOT NULL,           -- the stand-in
    owner_email    text NOT NULL,
    action         text NOT NULL,           -- e.g. 'take_action', 'send_email', 'view'
    shipment_id    uuid,
    milestone_id   uuid,
    detail         jsonb,
    created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cover_log_request ON cover_activity_log (request_id, created_at);
