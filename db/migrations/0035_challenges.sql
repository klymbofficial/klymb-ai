-- ─────────────────────────────────────────────────────────────
--  The 60-day challenges
--
--  Claude, Artificial Intelligence, Software Engineering and Data Science run
--  on the same learner app as the career tracks: a course.learners row per
--  person per challenge, a day_submissions row per day. A challenge has 60
--  days, so a day number may now go up to 60; the career tracks still stop at
--  30 in the app.
--
--  course.challenge_quiz_attempts holds each weekly multiple-choice quiz try,
--  written only after the server has scored it, so a browser cannot claim a
--  score. One row per learner per week per try.
--
--  Safe while the previous release is live: it only widens what may be
--  stored and adds a table the old code never reads.
--
--  Idempotent: safe to run more than once.
-- ─────────────────────────────────────────────────────────────

-- The day-range checks, found by their column rather than by name.
do $$
declare c record;
begin
  for c in
    select con.conrelid::regclass as tbl, con.conname
      from pg_constraint con
      join pg_attribute att on att.attrelid = con.conrelid and att.attnum = any(con.conkey)
     where con.conrelid in ('course.day_submissions'::regclass, 'course.coach_sessions'::regclass)
       and con.contype = 'c'
       and att.attname = 'day'
       and pg_get_constraintdef(con.oid) like '%30%'
  loop
    execute format('alter table %s drop constraint %I', c.tbl, c.conname);
  end loop;
end $$;

alter table course.day_submissions drop constraint if exists day_submissions_day_range;
alter table course.day_submissions add constraint day_submissions_day_range check (day between 1 and 60);
alter table course.coach_sessions drop constraint if exists coach_sessions_day_range;
alter table course.coach_sessions add constraint coach_sessions_day_range check (day between 1 and 60);

create table if not exists course.challenge_quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid not null references course.learners (id) on delete cascade,
  week smallint not null check (week between 1 and 9),
  attempt smallint not null check (attempt between 1 and 20),
  score smallint not null check (score >= 0),
  total smallint not null check (total > 0 and score <= total),
  -- The option index chosen for each question, in order.
  answers smallint[] not null,
  taken_at timestamptz not null default now(),
  unique (learner_id, week, attempt)
);

create index if not exists challenge_quiz_attempts_learner_idx on course.challenge_quiz_attempts (learner_id, week);
