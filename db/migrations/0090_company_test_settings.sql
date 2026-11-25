-- ─────────────────────────────────────────────────────────────
--  A company's settings for one test (U06a of the B2B plan,
--  U06_PROPOSAL.txt, approved 25 Nov: per company and test, not per
--  version; access off stops people already invited from starting;
--  an editable invitation email)
--
--    course.company_test_settings   one row per company and test, made on
--                                   the first save. No row: today's
--                                   behaviour (open, no end date, no tags,
--                                   reminders on, the standard invitation).
--      access_open      off: no new rounds, and nobody starts (an attempt
--                       already running finishes).
--      ends_on          nobody starts after it; rounds can't close later.
--      tags             up to 10, for the Assessments list.
--      auto_remind      off: the daily reminder skips this test.
--      invite_subject / invite_body   the invitation's own words, with
--                       {{variables}}; both null for the standard email.
--                       The link button, footer and support line are
--                       always added by the app.
--      revision         bumped on every save; a save names the one it read.
--
--  Cut-off and extra candidate fields come in U06b. New table only; the
--  previous release never reads it. Idempotent.
-- ─────────────────────────────────────────────────────────────

create table if not exists course.company_test_settings (
  company_id uuid not null references course.companies (id) on delete cascade,
  item_slug text not null references course.catalog_items (slug),
  access_open boolean not null default true,
  ends_on timestamptz,
  tags text[] not null default '{}' check (cardinality(tags) <= 10),
  auto_remind boolean not null default true,
  invite_subject text check (invite_subject is null or char_length(invite_subject) between 1 and 160),
  invite_body text check (invite_body is null or char_length(invite_body) between 1 and 3000),
  revision integer not null default 1 check (revision >= 1),
  updated_by text not null,
  updated_at timestamptz not null default now(),
  primary key (company_id, item_slug),
  constraint company_test_settings_template check ((invite_subject is null) = (invite_body is null))
);
