-- ─────────────────────────────────────────────────────────────
--  System Design: each lesson's Q&A, as a community thread
--
--  A question is a row with no parent; a reply points at its question. One
--  level only: a reply to a reply is a reply to the question, which is how
--  a chat under a lesson reads anyway.
--
--  Removing a post sets hidden_at rather than deleting it, so a moderator
--  can see what was taken down and why a thread has a gap. Replies to a
--  removed question go with it.
-- ─────────────────────────────────────────────────────────────

create table if not exists course.sd_qna (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  lesson text not null,
  parent_id uuid references course.sd_qna (id) on delete cascade,
  -- Never sent to other learners; it is how "mine" and moderation work.
  email text not null,
  -- The name shown, fixed when posted: a later rename on Google does not rewrite history.
  name text not null,
  -- Posted by someone in admin_users at the time: shown as the Klymb team.
  staff boolean not null default false,
  body text not null check (char_length(body) between 1 and 2000),
  hidden_at timestamptz,
  hidden_by text
);

-- A lesson's questions, newest first; and each question's replies in order.
create index if not exists sd_qna_lesson on course.sd_qna (lesson, created_at desc) where parent_id is null;
create index if not exists sd_qna_parent on course.sd_qna (parent_id, created_at) where parent_id is not null;

-- The application role is granted this by the default privileges set in
-- 0002_grants.sql, so nothing to add here.
