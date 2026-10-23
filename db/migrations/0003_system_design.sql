-- ─────────────────────────────────────────────────────────────
--  System Design course: learner activity and end-of-day feedback
--
--  The course keeps progress in the learner's browser; these tables are the
--  server-side record the admin reads.
--
--  Ported from supabase/migrations/20261023000000_system_design_activity.sql,
--  which landed on main while the database was moving. Same columns and
--  indexes, in `course` rather than `public`, and without the row-level
--  security lines: there are no policies to enforce here, because the only
--  role that can reach these tables is the one the server connects as.
--
--  Idempotent: safe to run more than once.
-- ─────────────────────────────────────────────────────────────

create table if not exists course.sd_events (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  anon_id text not null,          -- random id kept in the learner's browser
  email text,                     -- set when the learner is signed in
  event text not null,
  lesson text,                    -- course lesson id, e.g. "0-0" (Day 0), "1-0" (Day 1)
  step text,
  props jsonb not null default '{}'::jsonb,
  path text,
  lang text,
  device text
);

create index if not exists sd_events_created on course.sd_events (created_at desc);
create index if not exists sd_events_anon_created on course.sd_events (anon_id, created_at desc);
create index if not exists sd_events_lesson_event on course.sd_events (lesson, event);

create table if not exists course.sd_feedback (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  anon_id text not null,
  email text,
  lesson text not null,
  rating smallint not null check (rating between 1 and 5),
  clarity text check (clarity in ('yes', 'mostly', 'no')),
  will_finish text check (will_finish in ('yes', 'maybe', 'no')),
  improve text,
  lang text
);

create index if not exists sd_feedback_created on course.sd_feedback (created_at desc);

-- The application role is granted these by the default privileges set in
-- 0002_grants.sql, so nothing to add here. Re-running 0002 would be harmless
-- either way.
