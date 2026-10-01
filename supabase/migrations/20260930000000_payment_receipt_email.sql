-- ─────────────────────────────────────────────────────────────
--  Thank-you email, sent once per payment
--
--  The server claims a paid row by setting receipt_sent_at from null in a
--  single UPDATE, and only the request that wins the claim sends the email.
--  A retried verify call, a refresh or a later webhook finds it already set.
--
--  Additive and safe to run more than once.
-- ─────────────────────────────────────────────────────────────

alter table public.payments add column if not exists receipt_sent_at timestamptz;
