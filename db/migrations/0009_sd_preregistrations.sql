-- ─────────────────────────────────────────────────────────────
--  System Design: pre-registrations
--
--  One row per person who reserved a place at the early (Diwali) price
--  before the course takes payments. Nothing is charged here: they get
--  a payment link at the locked price when enrolment opens.
--
--  Keyed by email, so registering again updates the answers rather than
--  adding a second row.
--
--  Idempotent: safe to run more than once.
-- ─────────────────────────────────────────────────────────────

create table if not exists course.sd_preregistrations (
  email text primary key
    constraint sd_preregistrations_email_lowercase check (email = lower(email)),
  name text not null,
  phone text not null,
  -- "student" or "working"
  status text not null check (status in ('student', 'working')),
  -- The price shown when they reserved, in rupees, so the promise is on record.
  locked_price integer not null,
  consent boolean not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
