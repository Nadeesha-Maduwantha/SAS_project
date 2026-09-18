-- =============================================================================
-- SAS — per-user notepad
-- One row per note: some text, an owner (owner_email) and an optional link to
-- one shipment that owner is assigned to. Run once in the Supabase SQL
-- editor; every statement is re-runnable.
-- =============================================================================

CREATE TABLE IF NOT EXISTS user_notes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_email text,
  staff_code  text,
  -- Kept only so the older table shape stays valid; notes have no title and
  -- the API never writes this column.
  title       text,
  body        text NOT NULL DEFAULT '',
  -- Optional link to a shipment. Held as text rather than a foreign key so
  -- this migration cannot fail on the shipments id type; the API validates
  -- that the shipment exists and belongs to the user before storing it.
  -- The job number is kept alongside the id so the notes list can show a
  -- label without joining shipments on every read.
  shipment_id         text,
  shipment_job_number text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Columns added after the first version of this table shipped. Rows written by
-- that version carry only a staff_code, which was the same mock value for every
-- user, so they have no owner and stop appearing in anyone's list — there is no
-- way to tell whose they were. Delete them if the table already has rows:
--   DELETE FROM user_notes WHERE owner_email IS NULL;
ALTER TABLE user_notes ADD COLUMN IF NOT EXISTS owner_email         text;
ALTER TABLE user_notes ADD COLUMN IF NOT EXISTS shipment_id         text;
ALTER TABLE user_notes ADD COLUMN IF NOT EXISTS shipment_job_number text;

-- Notes are read back by owner, newest first.
CREATE INDEX IF NOT EXISTS user_notes_owner_email_idx ON user_notes (lower(owner_email));
CREATE INDEX IF NOT EXISTS user_notes_updated_at_idx  ON user_notes (updated_at DESC);
CREATE INDEX IF NOT EXISTS user_notes_shipment_id_idx ON user_notes (shipment_id);

-- Keep updated_at honest on every edit.
CREATE OR REPLACE FUNCTION set_user_notes_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS user_notes_set_updated_at ON user_notes;
CREATE TRIGGER user_notes_set_updated_at
  BEFORE UPDATE ON user_notes
  FOR EACH ROW EXECUTE FUNCTION set_user_notes_updated_at();

-- RLS — the backend talks to this table with the anon key and does its own
-- owner filtering, so the policies stay permissive (same pattern as
-- sales_digest_log.sql).
ALTER TABLE user_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS allow_select_user_notes ON user_notes;
CREATE POLICY allow_select_user_notes ON user_notes FOR SELECT USING (true);

DROP POLICY IF EXISTS allow_insert_user_notes ON user_notes;
CREATE POLICY allow_insert_user_notes ON user_notes FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS allow_update_user_notes ON user_notes;
CREATE POLICY allow_update_user_notes ON user_notes FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS allow_delete_user_notes ON user_notes;
CREATE POLICY allow_delete_user_notes ON user_notes FOR DELETE USING (true);
