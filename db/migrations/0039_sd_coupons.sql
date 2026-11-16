-- ─────────────────────────────────────────────────────────────
--  System Design: coupon codes
--
--  An owner makes a code in /admin/coupons with the price it gives, and
--  optionally how many people can use it and the last day it works. Pausing
--  sets paused_at; codes are never deleted, so every payment keeps its record.
--
--  course.payments.coupon_code is the code an order was made with, checked by
--  the server when the order is created. How many times a code was used is
--  counted from paid payments, so it can't drift.
--
--  Idempotent: safe to run more than once.
-- ─────────────────────────────────────────────────────────────

create table if not exists course.sd_coupons (
  code text primary key check (code ~ '^[A-Z0-9]{4,20}$'),
  price integer not null check (price >= 1),
  max_uses integer check (max_uses is null or max_uses > 0),
  ends_at timestamptz,
  paused_at timestamptz,
  note text check (note is null or length(note) <= 120),
  created_by text not null,
  created_at timestamptz not null default now()
);

alter table course.payments add column if not exists coupon_code text;

create index if not exists payments_coupon_idx on course.payments (coupon_code) where coupon_code is not null;
