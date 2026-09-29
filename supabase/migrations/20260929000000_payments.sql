-- ─────────────────────────────────────────────────────────────
--  Payments through Razorpay Standard Checkout
--
--  One row per Razorpay order. The server creates the order (amount taken
--  from the track's price in code, never from the browser), then marks the
--  row paid only after the checkout signature verifies.
--
--  Written and read by the service role only: the browser has no access.
--  Additive and safe to run more than once.
-- ─────────────────────────────────────────────────────────────

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  email text not null check (char_length(email) <= 254),
  track text not null check (track in ('qa-engineer','l1-l2-support','project-manager','junior-developer','reporting-analyst')),
  cohort_start date not null,
  amount integer not null check (amount >= 100),
  currency text not null default 'INR',
  razorpay_order_id text not null unique,
  razorpay_payment_id text unique,
  status text not null default 'created' check (status in ('created','paid','failed','refunded'))
);

create index if not exists payments_email_idx on public.payments (email, cohort_start);

alter table public.payments enable row level security;
revoke all on public.payments from anon, authenticated;
