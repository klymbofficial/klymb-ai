-- ─────────────────────────────────────────────────────────────
--  The voice placement coach: one row per spoken session, and the
--  evidence it recorded while it talked.
--
--  Two tables rather than one, because they are written at different moments
--  and for different reasons. coach_sessions is written when the call is
--  authorised, before a word is said, so a session that drops still leaves a
--  record that it happened. coach_skills is written during the conversation,
--  one row per skill as the coach assesses it — the point being that grading
--  never sits on the conversational path: the row is written while the next
--  question is already being asked.
--
--  What lands in coach_skills is a model's judgement relayed by the learner's
--  own browser. It is evidence a reviewer reads next to the deliverables, and
--  nothing in here unlocks a day, releases a fee or decides a placement. If
--  that ever changes, the levels will have to be re-earned somewhere the
--  learner does not sit in the middle of.
--
--  No transcript is stored. The captions exist so the learner can follow the
--  conversation; keeping the recording of someone practising for interviews
--  would be a liability with no reader.
--
--  Idempotent: safe to run more than once.
-- ─────────────────────────────────────────────────────────────

create table if not exists course.coach_sessions (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid not null references course.learners (id) on delete cascade,
  created_at timestamptz not null default now(),
  -- Set by end_assessment, or left null: a learner who closes the tab is the
  -- common case, not an error.
  ended_at timestamptz,
  track text not null
    constraint coach_sessions_track_check check (track in (
      'qa-engineer','l1-l2-support','project-manager','junior-developer','reporting-analyst','ai-product-manager'
    )),
  -- src/lib/coach/topics.ts. Stored as the id, so a relabelled topic stays
  -- comparable with the sessions that came before it.
  topic text not null,
  day smallint check (day between 1 and 30),
  -- Which model actually answered: the default moves faster than deploys do,
  -- and a change in how sessions go should be attributable to it.
  model text not null,
  -- The coach's own closing read, for a reviewer.
  summary text,
  -- Measured in the browser, from the learner finishing to the first word
  -- back. The target is one to two seconds; this is how we find out whether
  -- it is being met, rather than assuming the provider's number.
  first_reply_ms integer check (first_reply_ms between 1 and 60000)
);

-- The admin view is "this learner's sessions, newest first".
create index if not exists coach_sessions_learner on course.coach_sessions (learner_id, created_at desc);
-- And "how is this topic going across the cohort".
create index if not exists coach_sessions_topic on course.coach_sessions (topic, created_at desc);

create table if not exists course.coach_skills (
  id bigint generated always as identity primary key,
  session_id uuid not null references course.coach_sessions (id) on delete cascade,
  created_at timestamptz not null default now(),
  topic text not null,
  skill text not null,
  level text not null
    constraint coach_skills_level_check check (level in ('not-yet','shaky','solid','strong')),
  -- The learner's own words, which is what makes the level checkable.
  evidence text not null,
  next_step text
);

create index if not exists coach_skills_session on course.coach_skills (session_id, created_at);

comment on table course.coach_skills is
  'Evidence from a spoken coaching session. A model judgement relayed by the learner''s browser: read by reviewers, never used to grant access.';

-- The application role reaches both through the default privileges set in
-- 0002_grants.sql, so there is nothing to grant here.
