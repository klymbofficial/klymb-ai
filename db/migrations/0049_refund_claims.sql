-- ─────────────────────────────────────────────────────────────
--  Completion refund claims (System Design)
--
--  A learner who finished on schedule claims their refund with the button on
--  the final results. refund_claimed_at is when they did; Admin → Payments
--  lists it as a completion refund due until it's refunded.
--
--  Idempotent: safe to run more than once.
-- ─────────────────────────────────────────────────────────────

alter table course.payments add column if not exists refund_claimed_at timestamptz;
