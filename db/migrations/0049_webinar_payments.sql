-- ─────────────────────────────────────────────────────────────
--  Paid webinars: a seat confirmed by a Razorpay payment
--
--  A webinar with a price on /webinar (src/lib/webinar.ts) takes payment
--  before the seat is confirmed. The sign-up row is saved first, with the
--  order it is paying; paid_at is set once Razorpay's checkout signature
--  verifies or its webhook says the order was paid.
--
--  Free webinars leave all of these null, and their rows count as
--  registered as before. A paid webinar's row counts once paid_at is set.
--  Kept apart from course.payments, so course revenue, receipts and
--  enrollments never see a webinar ticket.
--
--  Idempotent: safe to run more than once.
-- ─────────────────────────────────────────────────────────────

alter table course.webinar_registrations
  -- In the currency's smallest unit (cents for USD, paise for INR).
  add column if not exists amount integer check (amount is null or amount >= 100),
  add column if not exists currency text check (currency is null or currency ~ '^[A-Z]{3}$'),
  add column if not exists razorpay_order_id text,
  add column if not exists razorpay_payment_id text,
  add column if not exists paid_at timestamptz;

create unique index if not exists webinar_registrations_order_idx
  on course.webinar_registrations (razorpay_order_id) where razorpay_order_id is not null;

create unique index if not exists webinar_registrations_payment_idx
  on course.webinar_registrations (razorpay_payment_id) where razorpay_payment_id is not null;
