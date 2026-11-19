-- ─────────────────────────────────────────────────────────────
--  Sales internship: personal links, credited sales and payouts
--
--  course.intern_codes: each intern's code (their link is klymb.ai/i/<code>).
--  course.payments.intern_code: the intern whose link a purchase came through.
--  Commission is 20% of what the buyer paid, counted for paid and later
--  refunded orders alike (refunds don't reduce it), by the month the order
--  was made (India time).
--  course.intern_payouts: what was paid to whom, for which month.
--
--  Idempotent: safe to run more than once.
-- ─────────────────────────────────────────────────────────────

create table if not exists course.intern_codes (
  code text primary key check (code ~ '^[A-Z0-9]{4,20}$'),
  email text not null unique
    constraint intern_codes_email_lowercase check (email = lower(email)),
  active boolean not null default true,
  created_by text not null,
  created_at timestamptz not null default now()
);

alter table course.payments add column if not exists intern_code text;

create index if not exists payments_intern_idx on course.payments (intern_code) where intern_code is not null;

create table if not exists course.intern_payouts (
  id uuid primary key default gen_random_uuid(),
  email text not null
    constraint intern_payouts_email_lowercase check (email = lower(email)),
  month date not null check (extract(day from month) = 1),
  amount integer not null check (amount > 0),
  method text not null check (method in ('upi', 'bank', 'other')),
  reference text check (reference is null or length(reference) <= 120),
  note text check (note is null or length(note) <= 300),
  paid_at timestamptz not null default now(),
  created_by text not null
);

create index if not exists intern_payouts_email_idx on course.intern_payouts (email, month);
