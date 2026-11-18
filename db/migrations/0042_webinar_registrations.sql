-- ─────────────────────────────────────────────────────────────
--  Webinar registrations
--
--  One row per person per webinar, from the form on /webinar. `webinar`
--  is the webinar's slug (src/lib/webinar.ts), so the next webinar's
--  sign-ups sit apart from this one's. Registering again with the same
--  email updates the answers rather than adding a second row.
--
--  confirmation_sent_at is set once the confirmation email (with the
--  WhatsApp group link) went out; null means it did not, and admin shows it.
--
--  Idempotent: safe to run more than once.
-- ─────────────────────────────────────────────────────────────

create table if not exists course.webinar_registrations (
  id bigint generated always as identity primary key,
  webinar text not null check (length(webinar) between 1 and 80),
  email text not null
    constraint webinar_registrations_email_lowercase check (email = lower(email)),
  name text not null check (length(name) between 2 and 120),
  phone text not null check (length(phone) <= 20),
  -- "student" or "working"
  role text not null check (role in ('student', 'working')),
  -- College or company, optional.
  org text check (org is null or length(org) <= 120),
  -- A question for the speaker, optional.
  question text check (question is null or length(question) <= 500),
  confirmation_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint webinar_registrations_one_per_email unique (webinar, email)
);

create index if not exists webinar_registrations_webinar_idx
  on course.webinar_registrations (webinar, created_at desc);
