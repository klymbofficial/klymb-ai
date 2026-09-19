-- ─────────────────────────────────────────────────────────────
--  Security hardening
--  Additive only: earlier migrations are already applied and are
--  left untouched. Safe to run more than once.
-- ─────────────────────────────────────────────────────────────

-- 1. ──────────────────────────────────────────────────────────
-- Close the anonymous enrolment RPC.
--
-- public.enrol_open_track is SECURITY DEFINER and was executable by anon, so
-- any caller could pass an arbitrary address, learn from the return value
-- whether it was registered, and mint a learner row for it. Enrolment now
-- happens in server-side code holding the service-role key; the function stays
-- for reference but nobody but the service role may call it.
revoke all on function public.enrol_open_track(text) from public;
revoke all on function public.enrol_open_track(text) from anon;
revoke all on function public.enrol_open_track(text) from authenticated;
grant execute on function public.enrol_open_track(text) to service_role;

-- 2. ──────────────────────────────────────────────────────────
-- The public no longer writes to registrations.
--
-- The registration form posts to a server action that uses the service-role
-- client, so the anonymous role needs no table privileges at all. RLS stays on:
-- privileges and policies are separate defences and we keep both.
revoke insert, update, delete on public.registrations from anon;
revoke insert, update, delete on public.registrations from authenticated;

-- The insert policy is retained but now has no role that can reach it; drop it
-- so the intent is not misread later as "the public can still register".
drop policy if exists "Public can register" on public.registrations;

-- service_role bypasses RLS, but be explicit about the privilege.
grant select, insert, update, delete on public.registrations to service_role;
grant select, insert, update, delete on public.learners to service_role;

-- 3. ──────────────────────────────────────────────────────────
-- Canonical, lowercase email identities.
--
-- Application code now compares with equality rather than ILIKE, where a
-- stored '%' or '_' would act as a wildcard. Existing rows are normalised only
-- where doing so cannot collide with another row: nothing is merged or deleted
-- here, because two distinct people could hold addresses differing only by
-- case and resolving that is a human decision.
do $$
declare
  skipped int;
begin
  update public.registrations r
     set email = lower(r.email)
   where r.email <> lower(r.email)
     and not exists (
       select 1 from public.registrations other
        where lower(other.email) = lower(r.email)
          and other.cohort_start = r.cohort_start
          and other.id <> r.id
     );

  update public.learners l
     set email = lower(l.email)
   where l.email <> lower(l.email)
     and not exists (
       select 1 from public.learners other
        where lower(other.email) = lower(l.email)
          and other.id <> l.id
     );

  update public.admin_users a
     set email = lower(a.email)
   where a.email <> lower(a.email)
     and not exists (
       select 1 from public.admin_users other
        where lower(other.email) = lower(a.email)
          and other.email <> a.email
     );

  select count(*) into skipped
    from public.registrations
   where email <> lower(email);
  if skipped > 0 then
    raise notice 'Left % registration row(s) un-normalised because lowercasing would collide. Resolve these by hand.', skipped;
  end if;
end $$;

-- New and updated rows must be canonical. NOT VALID so that any pre-existing
-- collision row does not block this migration; validate once those are fixed:
--   alter table public.registrations validate constraint registrations_email_lowercase;
alter table public.registrations drop constraint if exists registrations_email_lowercase;
alter table public.registrations
  add constraint registrations_email_lowercase check (email = lower(email)) not valid;

alter table public.learners drop constraint if exists learners_email_lowercase;
alter table public.learners
  add constraint learners_email_lowercase check (email = lower(email)) not valid;

alter table public.admin_users drop constraint if exists admin_users_email_lowercase;
alter table public.admin_users
  add constraint admin_users_email_lowercase check (email = lower(email)) not valid;

-- 4. ──────────────────────────────────────────────────────────
-- Registration throttle.
--
-- One row per attempt, keyed by a salted hash of the caller's IP — the raw
-- address is never stored, so this table cannot be used to identify anyone.
create table if not exists public.rate_limit_events (
  id uuid primary key default gen_random_uuid(),
  action text not null check (char_length(action) between 1 and 40),
  fingerprint text not null check (char_length(fingerprint) between 8 and 64),
  created_at timestamptz not null default now()
);

create index if not exists rate_limit_events_lookup_idx
  on public.rate_limit_events (action, fingerprint, created_at desc);

alter table public.rate_limit_events enable row level security;
revoke all on public.rate_limit_events from anon, authenticated;
grant select, insert, delete on public.rate_limit_events to service_role;

-- Housekeeping: old attempts have no value. Run periodically (pg_cron or by
-- hand); the index above keeps this cheap.
--   delete from public.rate_limit_events where created_at < now() - interval '7 days';
