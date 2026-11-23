-- ─────────────────────────────────────────────────────────────
--  Worldwide: local-currency payments and each learner's own day
--
--  course.payments.amount_inr: what the charge is worth in INR paise, so
--    revenue totals, refunds owed and intern commission stay in rupees when
--    buyers pay in dollars, euros or anything else. Equal to `amount` for an
--    INR payment (backfilled below); converted at `fx_rate` otherwise, and
--    replaced by Razorpay's own INR figure once the payment is captured.
--  course.payments.fx_rate: what 1 INR was worth in `currency` when the
--    order was made. Null for INR.
--  course.sd_preregistrations.country: where they claimed from, so the
--    "your price is held" and follow-up emails quote their own currency.
--  course.enrollments.timezone, course.learners.timezone: the learner's IANA
--    time zone. "One lesson a day" and the day's reminders follow its
--    midnight. Everyone enrolled before this keeps India time, so no streak,
--    pace or refund moves.
--
--  New code writes these in their own statements and reads them with a
--  fallback, so a preview running against an unmigrated database still works.
--
--  Idempotent: safe to run more than once.
-- ─────────────────────────────────────────────────────────────

alter table course.payments add column if not exists amount_inr integer;
alter table course.payments add column if not exists fx_rate numeric;
update course.payments set amount_inr = amount where amount_inr is null and currency = 'INR';

alter table course.sd_preregistrations add column if not exists country text
  check (country is null or country ~ '^[A-Z]{2}$');

alter table course.enrollments add column if not exists timezone text not null default 'Asia/Kolkata'
  check (char_length(timezone) between 1 and 64);
alter table course.learners add column if not exists timezone text not null default 'Asia/Kolkata'
  check (char_length(timezone) between 1 and 64);
