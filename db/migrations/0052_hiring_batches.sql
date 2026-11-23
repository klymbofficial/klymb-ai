-- ─────────────────────────────────────────────────────────────
--  Hiring batches: a recruiter invites candidates to one approved
--  version of a test
--
--    hiring_batches     one per batch a recruiter schedules: the test
--                       version (approved by the company when the batch was
--                       made), the role, an optional prep course, the
--                       reviewer, when it opens and closes, and the time zone
--                       the recruiter wrote those times in. A batch starts as
--                       a draft (the recruiter previews it), is sent once, and
--                       can be cancelled. request_key makes a retried submit
--                       land once.
--    batch_candidates   one row per person in a batch. Their private link is
--                       made from the row id and link_generation (signed by
--                       the app), so reissuing a link bumps the generation and
--                       the old link stops working. A retried delivery sends
--                       the same link and adds no row. extra_minutes and
--                       last_start_at are one person's extension. A cancelled
--                       candidate's link can't start the test.
--    batch_mail_log     every email sent or attempted to a candidate
--                       (invite, reminder, automatic reminder, new link,
--                       extension), with the error when it failed. Never
--                       changed; the recruiter reads it to find and fix a
--                       failed delivery.
--
--  The last moment a candidate can start is their own last_start_at when an
--  extension set one, else the closing time minus the time allowed (the
--  version's minutes plus extra_minutes), so whoever starts in time gets
--  their full time. The app works that out; the database keeps the inputs.
--
--  Adds three tables the previous release never reads, so it is safe while
--  that release is live. Nothing is sent from here.
--
--  Idempotent: safe to run more than once.
-- ─────────────────────────────────────────────────────────────

create table if not exists course.hiring_batches (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references course.companies (id) on delete cascade,
  -- The catalog item and the exact version candidates take.
  item text not null references course.catalog_items (slug),
  version_id uuid not null references course.assessment_versions (id),
  role text not null constraint hiring_batches_role check (char_length(role) between 1 and 120),
  prep_course text constraint hiring_batches_prep_course check (prep_course is null or prep_course in ('system-design')),
  reviewer_email text not null,
  constraint hiring_batches_reviewer
    foreign key (company_id, reviewer_email) references course.company_members (company_id, email) on update cascade,
  opens_at timestamptz not null,
  closes_at timestamptz not null,
  constraint hiring_batches_window check (closes_at > opens_at),
  time_zone text not null constraint hiring_batches_time_zone check (char_length(time_zone) between 1 and 64),
  status text not null default 'draft'
    constraint hiring_batches_status check (status in ('draft', 'sent', 'cancelled')),
  request_key uuid not null,
  created_by text not null,
  created_at timestamptz not null default now(),
  sent_by text,
  sent_at timestamptz,
  constraint hiring_batches_sent_pair check ((sent_at is null) = (sent_by is null)),
  cancelled_by text,
  cancelled_at timestamptz,
  constraint hiring_batches_cancelled_pair check ((cancelled_at is null) = (cancelled_by is null)),
  constraint hiring_batches_cancelled_status check ((status = 'cancelled') = (cancelled_at is not null)),
  constraint hiring_batches_request_once unique (company_id, request_key),
  constraint hiring_batches_id_company unique (id, company_id)
);

create index if not exists hiring_batches_company_idx on course.hiring_batches (company_id, created_at desc);

create table if not exists course.batch_candidates (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null,
  company_id uuid not null,
  constraint batch_candidates_batch
    foreign key (batch_id, company_id) references course.hiring_batches (id, company_id) on delete cascade,
  name text not null constraint batch_candidates_name check (char_length(name) between 1 and 120),
  email text not null
    constraint batch_candidates_email check (email = lower(email) and char_length(email) between 3 and 254),
  -- One person's extension: extra time once they start, and a later last start.
  extra_minutes integer not null default 0 constraint batch_candidates_extra_minutes check (extra_minutes between 0 and 480),
  last_start_at timestamptz,
  link_generation integer not null default 1 constraint batch_candidates_link_generation check (link_generation >= 1),
  status text not null default 'active'
    constraint batch_candidates_status check (status in ('active', 'cancelled')),
  cancelled_by text,
  cancelled_at timestamptz,
  constraint batch_candidates_cancelled check ((status = 'cancelled') = (cancelled_at is not null) and (cancelled_at is null) = (cancelled_by is null)),
  -- The latest delivery of their link: not sent yet, being sent, sent, failed,
  -- or skipped by the mailer (a bounced or unsubscribed address).
  delivery text not null default 'pending'
    constraint batch_candidates_delivery check (delivery in ('pending', 'sending', 'sent', 'failed', 'skipped')),
  delivery_error text constraint batch_candidates_delivery_error check (delivery_error is null or char_length(delivery_error) <= 500),
  -- When a send claimed this row. Only one send holds it at a time; one
  -- interrupted for more than a few minutes can be retried.
  delivery_claimed_at timestamptz,
  delivered_at timestamptz,
  reminders_sent integer not null default 0,
  last_reminded_at timestamptz,
  auto_reminded_at timestamptz,
  added_at timestamptz not null default now(),
  constraint batch_candidates_once unique (batch_id, email)
);

create index if not exists batch_candidates_email_idx on course.batch_candidates (email) where status = 'active';

create table if not exists course.batch_mail_log (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references course.batch_candidates (id) on delete cascade,
  kind text not null
    constraint batch_mail_log_kind check (kind in ('invite', 'reminder', 'auto_reminder', 'new_link', 'extension')),
  link_generation integer not null,
  outcome text not null constraint batch_mail_log_outcome check (outcome in ('sent', 'failed', 'skipped')),
  error text constraint batch_mail_log_error check (error is null or char_length(error) <= 500),
  -- The recruiter who sent it; null for the automatic reminder.
  sent_by text,
  at timestamptz not null default now()
);

create index if not exists batch_mail_log_candidate_idx on course.batch_mail_log (candidate_id, at desc);
