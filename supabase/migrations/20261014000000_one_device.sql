-- ─────────────────────────────────────────────────────────────
--  One device per learner
--
--  device_session: the session id of the device holding the learner's
--  single slot; device_seen_at: when it was last used. A second device is
--  refused while the first was used in the last 7 days. Sign-out or an
--  admin reset clears both. Additive and safe to run more than once.
-- ─────────────────────────────────────────────────────────────

alter table public.learners add column if not exists device_session text;
alter table public.learners add column if not exists device_seen_at timestamptz;
