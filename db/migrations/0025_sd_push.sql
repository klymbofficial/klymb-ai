-- ─────────────────────────────────────────────────────────────
--  System Design: browser notifications
--
--  course.push_subscriptions belongs to learners on the 30-day tracks, and a
--  System Design buyer has no row in course.learners. So their devices are kept
--  here, by email, one row per device. The 8 PM reminder job reads them.
--
--  Idempotent: safe to run more than once.
-- ─────────────────────────────────────────────────────────────

create table if not exists course.sd_push_subscriptions (
  endpoint text primary key,
  email text not null
    constraint sd_push_email_lowercase check (email = lower(email)),
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

create index if not exists sd_push_email_idx on course.sd_push_subscriptions (email);
