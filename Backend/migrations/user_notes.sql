-- =============================================================
--  user_notes — free-text notepad shown on the user dashboards.
--
--  Run this once in the Supabase SQL editor before using the
--  notepad; the API returns an empty list until the table exists.
--
--  staff_code is the owner. It is plain text rather than a foreign
--  key to profiles because useAuth() still returns a placeholder
--  code — when real sessions land, add the FK then.
-- =============================================================

create table if not exists public.user_notes (
    id         uuid        primary key default gen_random_uuid(),
    staff_code text        not null,
    title      text,
    body       text        not null default '',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- The dashboard lists a user's notes newest-first, so index that path.
create index if not exists user_notes_staff_code_updated_idx
    on public.user_notes (staff_code, updated_at desc);

-- Keep updated_at honest without relying on the API to send it.
create or replace function public.set_user_notes_updated_at()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

drop trigger if exists user_notes_set_updated_at on public.user_notes;

create trigger user_notes_set_updated_at
    before update on public.user_notes
    for each row
    execute function public.set_user_notes_updated_at();

-- Row level security.
--
-- The backend talks to Supabase with the anon key, so with RLS on and no
-- policy every insert fails with 42501. Every other table in this schema is
-- already open to that key, so this matches them rather than making
-- user_notes the odd one out.
--
-- This is not real isolation: the anon key ships to the browser, so notes are
-- only separated by the staff_code filter in the API, not by the database.
-- Once the backend moves to the service_role key, turn RLS back on and add a
-- policy keyed on the authenticated user instead.
alter table public.user_notes disable row level security;
