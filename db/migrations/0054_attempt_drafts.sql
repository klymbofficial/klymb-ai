-- ─────────────────────────────────────────────────────────────
--  Attempt drafts: a candidate's answer, saved as they write
--  (H07a of the hiring plan, H05_PROPOSAL)
--
--    attempt_drafts  one row per attempt: the answer as last saved, and
--                    its revision. Every save names the revision it was
--                    based on and only lands if that is still the latest,
--                    so a second tab or device can't overwrite newer work
--                    unseen; it is told to reload instead. Saves are
--                    accepted while the attempt runs, plus a short grace
--                    for a save already on its way at the deadline (the
--                    app checks the time; the row only keeps the text).
--                    This is the only answer that changes: submitting
--                    (H08) copies it into a frozen submission.
--
--  Adds a table the previous release never reads, so it is safe while that
--  release is live.
--
--  Idempotent: safe to run more than once.
-- ─────────────────────────────────────────────────────────────

create table if not exists course.attempt_drafts (
  attempt_id uuid primary key references course.candidate_attempts (id) on delete cascade,
  revision integer not null constraint attempt_drafts_revision check (revision >= 1),
  answer text not null constraint attempt_drafts_answer check (char_length(answer) <= 60000),
  saved_at timestamptz not null default now()
);
