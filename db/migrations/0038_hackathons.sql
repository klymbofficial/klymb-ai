-- ─────────────────────────────────────────────────────────────
--  Hackathons
--
--  One event at a time, set in src/data/hackathon. Everything here is filed
--  under that event's id, so each event's teams and entries stay apart.
--
--  hackathon_interest   "tell me when it opens", before an event has dates
--  hackathon_teams      a team (a solo entry is a team of one) and its join code
--  hackathon_members    who is on it; one team per person per event
--  hackathon_entries    the team's submission: repo, live URL, AI-usage log
--  hackathon_scores     each judge's marks on the three criteria
--  hackathon_results    the published winners
--
--  Adds tables the previous release never reads, so it is safe while that
--  release is live.
--
--  Idempotent: safe to run more than once.
-- ─────────────────────────────────────────────────────────────

create table if not exists course.hackathon_interest (
  event_id text not null,
  email text not null constraint hackathon_interest_email_lowercase check (email = lower(email)),
  created_at timestamptz not null default now(),
  primary key (event_id, email)
);

create table if not exists course.hackathon_teams (
  id uuid primary key default gen_random_uuid(),
  event_id text not null,
  code text not null check (code ~ '^[A-Z0-9]{6}$'),
  name text check (char_length(name) <= 60),
  created_at timestamptz not null default now(),
  unique (event_id, code)
);

create table if not exists course.hackathon_members (
  id uuid primary key default gen_random_uuid(),
  event_id text not null,
  team_id uuid not null references course.hackathon_teams (id) on delete cascade,
  email text not null constraint hackathon_members_email_lowercase check (email = lower(email)),
  name text not null check (char_length(name) between 2 and 120),
  phone text not null check (char_length(phone) <= 20),
  college text not null check (char_length(college) between 2 and 160),
  graduation_year smallint not null check (graduation_year between 1990 and 2035),
  is_leader boolean not null default false,
  created_at timestamptz not null default now(),
  unique (event_id, email)
);
create index if not exists hackathon_members_team_idx on course.hackathon_members (team_id);

create table if not exists course.hackathon_entries (
  team_id uuid primary key references course.hackathon_teams (id) on delete cascade,
  brief_id text not null check (char_length(brief_id) <= 64),
  repo_url text not null check (char_length(repo_url) <= 500),
  live_url text not null check (char_length(live_url) <= 500),
  ai_log_url text not null check (char_length(ai_log_url) <= 500),
  notes text check (char_length(notes) <= 2000),
  submitted_by text not null,
  updated_at timestamptz not null default now()
);

create table if not exists course.hackathon_scores (
  team_id uuid not null references course.hackathon_teams (id) on delete cascade,
  judge_email text not null,
  product smallint not null check (product between 0 and 10),
  prompting smallint not null check (prompting between 0 and 10),
  polish smallint not null check (polish between 0 and 10),
  comment text check (char_length(comment) <= 1000),
  updated_at timestamptz not null default now(),
  primary key (team_id, judge_email)
);

create table if not exists course.hackathon_results (
  event_id text not null,
  place smallint not null check (place between 1 and 10),
  team_id uuid not null references course.hackathon_teams (id) on delete cascade,
  title text not null check (char_length(title) <= 60),
  published_at timestamptz,
  primary key (event_id, place)
);
