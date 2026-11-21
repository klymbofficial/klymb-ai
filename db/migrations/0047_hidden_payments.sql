-- ─────────────────────────────────────────────────────────────
--  Hidden payments: test purchases kept, but out of admin views
--
--  A payment with hidden_at set stays in the table (and in Razorpay), with
--  its seat and everything else untouched. It just isn't listed in Admin →
--  Payments & refunds or counted in the Overview money totals.
--
--  Idempotent: safe to run more than once.
-- ─────────────────────────────────────────────────────────────

alter table course.payments add column if not exists hidden_at timestamptz;
