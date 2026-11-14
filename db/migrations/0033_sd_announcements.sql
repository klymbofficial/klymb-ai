-- ─────────────────────────────────────────────────────────────
--  System Design: announcements
--
--  Posted by an owner from /admin/announcements and shown in the inbox of the
--  System Design app. `audience` picks who sees it: every enrolled learner, or
--  paid seats only. Removing one sets removed_at; the row stays as a record.
--  Whether a learner has read one is kept on their device, not here.
--
--  Idempotent: safe to run more than once.
-- ─────────────────────────────────────────────────────────────

create table if not exists course.sd_announcements (
  id bigint generated always as identity primary key,
  title text not null check (length(title) between 1 and 120),
  body text not null check (length(body) between 1 and 1000),
  link_url text check (link_url is null or link_url ~ '^https://'),
  link_label text check (link_label is null or length(link_label) between 1 and 40),
  audience text not null check (audience in ('all', 'paid')),
  created_by text not null,
  created_at timestamptz not null default now(),
  removed_at timestamptz,
  pushed int not null default 0,
  emailed int not null default 0
);

create index if not exists sd_announcements_live_idx on course.sd_announcements (created_at desc) where removed_at is null;
