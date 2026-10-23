-- ─────────────────────────────────────────────────────────────
--  The course schema, on the platform's database
--
--  klymb.ai used to hold its own Supabase project. It now shares the Neon
--  database that runs app.klymb.ai, so a learner here is the same person as
--  the platform user with that address — see learners.user_id below.
--
--  Everything lives in the `course` schema, never in `public`:
--
--    * `public` belongs to app.klymb.ai's Prisma. Prisma has no `multiSchema`
--      and no `schemas` list, so it manages `public` alone and never sees
--      `course`. Putting these tables anywhere else would show up as drift in
--      `prisma migrate dev` and invite an offer to reset them.
--    * The application connects as a role that may touch `course` and nothing
--      else, so a bug here cannot reach the platform's tables. That replaces
--      the Supabase service-role key, which bypassed RLS on everything.
--
--  This consolidates the twenty Supabase migrations in supabase/migrations/,
--  which stay in the tree as history and are not applied anywhere any more.
--  Dropped on the way over, each verified unreferenced by src/:
--
--    * every policy and every grant to anon / authenticated / service_role.
--      They keyed off auth.jwt() and auth.uid(); klymb.ai authenticates with
--      NextAuth and Google and never signed anyone into Supabase Auth, so no
--      policy ever matched a real request. Authorisation lives in the DAL
--      (src/lib/admin/auth.ts, src/lib/learner/data.ts).
--    * public.is_admin() — read the admin list directly instead.
--    * public.enrol_open_track() — src/app/admin/enroll.ts inserts directly.
--
--  Idempotent: safe to run more than once.
-- ─────────────────────────────────────────────────────────────

create schema if not exists course;

-- ── Registrations ───────────────────────────────────────────
-- From the public "Register my interest" form.
create table if not exists course.registrations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null check (char_length(name) between 2 and 120),
  email text not null check (char_length(email) <= 254),
  phone text not null check (char_length(phone) <= 20),
  track text not null,
  job_role text not null,
  experience text not null,
  linkedin text,
  github text,
  consent boolean not null check (consent),
  cohort_start date not null,
  -- 0 = none sent, 1..3 = that follow-up sent. New rows enter the sequence.
  followup_stage smallint not null default 0,
  followup_sent_at timestamptz
);

comment on column course.registrations.github is
  'Optional GitHub profile URL given at registration. Not verified — the learner''s verified GitHub identity lives on course.learners.github_username.';

-- One registration per email per cohort: a repeat submit returns a duplicate
-- error the app turns into a friendly message.
create unique index if not exists registrations_email_cohort_key
  on course.registrations (lower(email), cohort_start);
create index if not exists registrations_created_at_idx
  on course.registrations (created_at desc);

-- ── Admin list ──────────────────────────────────────────────
-- Add rows to grant admin access; delete to revoke.
create table if not exists course.admin_users (
  email text primary key,
  name text,
  added_at timestamptz not null default now()
);

-- ── Learners ────────────────────────────────────────────────
-- email is the operative key: it is the Google-verified identity the app
-- authorises against, and every query filters on it. user_id is the link to
-- the platform's 13k+ users, resolved by email when a row is written — null
-- for a course registrant who has no app.klymb.ai account yet.
create table if not exists course.learners (
  id uuid primary key default gen_random_uuid(),
  user_id text unique references public."User" (id) on delete set null,
  email text not null unique,
  name text not null,
  track text not null,
  cohort_start date not null,
  github_url text,
  linkedin_url text,
  github_username text,
  linkedin_slug text,
  status text not null default 'active'
    check (status in ('active','paused','withdrawn','completed')),
  created_at timestamptz not null default now(),
  -- One device per learner: the session id holding the slot, and when it was
  -- last used. A second device is refused while the first was used in the
  -- last 7 days. Sign-out or an admin reset clears both.
  device_session text,
  device_seen_at timestamptz
);

create index if not exists learners_cohort_idx on course.learners (cohort_start, track);

-- ── Daily submissions ───────────────────────────────────────
create table if not exists course.day_submissions (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid not null references course.learners (id) on delete cascade,
  day smallint not null check (day between 1 and 30),
  deliverable_url text,
  note text,
  -- Knowledge-check answers live with the day's submission so a reviewer sees
  -- the work and the reasoning together.
  quiz_answers jsonb,
  -- Weekly LinkedIn posts are evidence in their own right.
  linkedin_post_url text,
  status text not null default 'submitted'
    check (status in ('submitted','reviewed','needs_rework')),
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewer_note text,
  unique (learner_id, day)
);

create index if not exists day_submissions_learner_idx
  on course.day_submissions (learner_id, day);

-- ── Weekly assessments ──────────────────────────────────────
create table if not exists course.assessment_results (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid not null references course.learners (id) on delete cascade,
  after_day smallint not null check (after_day in (7, 14, 21, 28)),
  -- { judgment, evidence, communication, ai_direction, delivery_discipline } each 1–4
  scores jsonb,
  weighted_score numeric(3,2),
  band text check (band in ('not_yet','developing','job_ready','distinction')),
  feedback text,
  reviewed_at timestamptz,
  reviewer_email text,
  created_at timestamptz not null default now(),
  unique (learner_id, after_day)
);

-- ── Payments ────────────────────────────────────────────────
-- One row per Razorpay order. The server creates the order (amount taken from
-- the track's price in code, never from the browser), then marks the row paid
-- only after the checkout signature verifies.
create table if not exists course.payments (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  email text not null check (char_length(email) <= 254),
  track text not null,
  cohort_start date not null,
  amount integer not null check (amount >= 100),
  currency text not null default 'INR',
  razorpay_order_id text not null unique,
  razorpay_payment_id text unique,
  status text not null default 'created'
    check (status in ('created','paid','failed','refunded')),
  -- The server claims a paid row by setting this from null in a single
  -- UPDATE; only the request that wins the claim sends the thank-you email.
  receipt_sent_at timestamptz
);

create index if not exists payments_email_idx on course.payments (email, cohort_start);

-- ── Push subscriptions ──────────────────────────────────────
-- One row per device a learner allowed reminders on.
create table if not exists course.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  learner_id uuid not null references course.learners (id) on delete cascade,
  endpoint text not null unique check (char_length(endpoint) <= 1000),
  p256dh text not null check (char_length(p256dh) <= 200),
  auth text not null check (char_length(auth) <= 100)
);

create index if not exists push_subscriptions_learner_idx
  on course.push_subscriptions (learner_id);

-- ── Support tickets ─────────────────────────────────────────
create table if not exists course.support_tickets (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  email text not null,
  name text,
  message text not null,
  page text,
  context jsonb not null default '{}'::jsonb,
  status text not null default 'open' check (status in ('open','resolved')),
  resolved_at timestamptz
);

create index if not exists support_tickets_status_created
  on course.support_tickets (status, created_at desc);

-- ── Admin audit log ─────────────────────────────────────────
-- Append-only: the trigger below refuses every UPDATE and DELETE, so an entry
-- cannot be quietly edited or removed afterwards.
create table if not exists course.admin_audit_log (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  admin_email text not null,
  action text not null,
  target text,
  details jsonb not null default '{}'::jsonb
);

create index if not exists admin_audit_log_at on course.admin_audit_log (at desc);

create or replace function course.admin_audit_log_append_only()
returns trigger language plpgsql as $$
begin
  raise exception 'admin_audit_log is append-only';
end;
$$;

drop trigger if exists admin_audit_log_no_change on course.admin_audit_log;
create trigger admin_audit_log_no_change
  before update or delete on course.admin_audit_log
  for each row execute function course.admin_audit_log_append_only();

-- ── Rate limiting ───────────────────────────────────────────
-- One row per attempt, keyed by a salted hash of the caller's IP — the raw
-- address is never stored, so this table cannot be used to identify anyone.
create table if not exists course.rate_limit_events (
  id uuid primary key default gen_random_uuid(),
  action text not null check (char_length(action) between 1 and 40),
  fingerprint text not null check (char_length(fingerprint) between 8 and 64),
  created_at timestamptz not null default now()
);

create index if not exists rate_limit_events_lookup_idx
  on course.rate_limit_events (action, fingerprint, created_at desc);

-- The limiter used to COUNT recent attempts and then, one network round trip
-- later, INSERT the new one. Requests arriving together all counted the same
-- number and all passed: twenty simultaneous registrations from one address
-- went through a limit of five.
--
-- This function does the count and the insert inside one transaction, and
-- takes a transaction-scoped advisory lock on the (action, caller) pair first,
-- so concurrent callers with the same key queue behind each other and each
-- sees the attempts before it. Different callers never contend.
--
-- The advisory lock is transaction-scoped, so this must be called on a single
-- session — src/lib/db/client.ts routes it through the pooled driver, never
-- the one-shot HTTP one.
create or replace function course.rate_limit_hit(
  p_action text,
  p_fingerprint text,
  p_limit integer,
  p_window_minutes integer
)
returns boolean
language plpgsql
security invoker
set search_path = course, pg_temp
as $$
declare
  recent integer;
begin
  if p_limit not between 1 and 1000 or p_window_minutes not between 1 and 1440 then
    raise exception 'rate_limit_hit: limit or window out of range';
  end if;

  -- Serialise only callers sharing this key; released at commit.
  perform pg_advisory_xact_lock(hashtextextended(p_action || ':' || p_fingerprint, 0));

  select count(*) into recent
    from course.rate_limit_events
   where action = p_action
     and fingerprint = p_fingerprint
     and created_at >= now() - make_interval(mins => p_window_minutes);

  if recent >= p_limit then
    return false;
  end if;

  insert into course.rate_limit_events (action, fingerprint) values (p_action, p_fingerprint);

  -- Roughly one call in a hundred sweeps out attempts nobody will count again.
  if random() < 0.01 then
    delete from course.rate_limit_events where created_at < now() - interval '1 day';
  end if;

  return true;
end;
$$;

-- ── Canonical, lowercase email identities ───────────────────
-- Application code compares with equality rather than ILIKE, where a stored
-- '%' or '_' would act as a wildcard. A fresh schema has no rows to normalise
-- first, so unlike the Supabase original these are valid from the start.
alter table course.registrations drop constraint if exists registrations_email_lowercase;
alter table course.registrations
  add constraint registrations_email_lowercase check (email = lower(email));

alter table course.learners drop constraint if exists learners_email_lowercase;
alter table course.learners
  add constraint learners_email_lowercase check (email = lower(email));

alter table course.admin_users drop constraint if exists admin_users_email_lowercase;
alter table course.admin_users
  add constraint admin_users_email_lowercase check (email = lower(email));

-- Basic shape guard so junk cannot be stored even if the app is bypassed.
alter table course.registrations drop constraint if exists registrations_email_shape;
alter table course.registrations
  add constraint registrations_email_shape
  check (email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]{2,}$');

-- ── Track allowlist ─────────────────────────────────────────
-- Kept as named constraints on every table that stores a track, so adding a
-- track is one migration that re-states all three.
alter table course.registrations drop constraint if exists registrations_track_check;
alter table course.registrations add constraint registrations_track_check
  check (track in ('qa-engineer','l1-l2-support','project-manager','junior-developer','reporting-analyst','ai-product-manager'));

alter table course.learners drop constraint if exists learners_track_check;
alter table course.learners add constraint learners_track_check
  check (track in ('qa-engineer','l1-l2-support','project-manager','junior-developer','reporting-analyst','ai-product-manager'));

alter table course.payments drop constraint if exists payments_track_check;
alter table course.payments add constraint payments_track_check
  check (track in ('qa-engineer','l1-l2-support','project-manager','junior-developer','reporting-analyst','ai-product-manager'));
