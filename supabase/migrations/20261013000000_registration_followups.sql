-- ─────────────────────────────────────────────────────────────
--  Follow-up emails for registered-but-unpaid learners
--
--  followup_stage: 0 = none sent, 1..3 = that follow-up sent, 3 = done.
--  Existing registrations start at 3 so nobody gets a sudden burst;
--  only registrations from now on enter the sequence.
--  Additive and safe to run more than once.
-- ─────────────────────────────────────────────────────────────

alter table public.registrations add column if not exists followup_stage smallint not null default 0;
alter table public.registrations add column if not exists followup_sent_at timestamptz;

update public.registrations set followup_stage = 3
  where followup_sent_at is null and created_at < '2026-10-13T12:00:00+05:30';
