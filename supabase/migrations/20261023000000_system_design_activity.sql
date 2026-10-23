-- ─────────────────────────────────────────────────────────────
--  System Design course: learner activity and end-of-day feedback
--
--  The course keeps progress in the learner's browser; these tables are
--  the server-side record the admin reads. Written only by the server
--  (service role); RLS on with no policies, so the browser can never read
--  or write them directly. Additive, safe to re-run.
-- ─────────────────────────────────────────────────────────────

create table if not exists public.sd_events (
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
create index if not exists sd_events_created on public.sd_events (created_at desc);
create index if not exists sd_events_anon_created on public.sd_events (anon_id, created_at desc);
create index if not exists sd_events_lesson_event on public.sd_events (lesson, event);
alter table public.sd_events enable row level security;

create table if not exists public.sd_feedback (
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
create index if not exists sd_feedback_created on public.sd_feedback (created_at desc);
alter table public.sd_feedback enable row level security;
