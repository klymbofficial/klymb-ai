-- ─────────────────────────────────────────────────────────────
--  Self-paced courses: progress saved to the account
--
--  The Agentic AI Systems course is read module by module. course_progress
--  holds, per person per course per module, when they marked it done and
--  their best score on its quiz, so their place follows them to any device.
--  Keyed by the Google-verified email, like course.lesson_checks: nobody has
--  to enrol first to read a free course.
--
--  Adds one table the previous release never reads, so it is safe while that
--  release is live.
--
--  Idempotent: safe to run more than once.
-- ─────────────────────────────────────────────────────────────

create table if not exists course.course_progress (
  email text not null
    constraint course_progress_email_lowercase check (email = lower(email)),
  course text not null check (char_length(course) between 1 and 64),
  module text not null check (char_length(module) between 1 and 64),
  -- Null until they mark the module done; cleared if they unmark it.
  done_at timestamptz,
  quiz_score smallint check (quiz_score >= 0),
  quiz_total smallint check (quiz_total > 0),
  updated_at timestamptz not null default now(),
  primary key (email, course, module),
  check (quiz_score is null or (quiz_total is not null and quiz_score <= quiz_total))
);
