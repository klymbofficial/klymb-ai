-- ─────────────────────────────────────────────────────────────
--  Candidate attempts: a candidate starts their test, and the
--  server owns the clock (H06 of the hiring plan, H05_PROPOSAL)
--
--    candidate_attempts  one row per start. Made by the candidate pressing
--                        Start on their private link, once: (candidate_id,
--                        attempt_no) is unique, so a double click or two tabs
--                        make one attempt, and pressing Start again resumes
--                        it. version_id is the batch's version at the start,
--                        allowed_minutes the version's minutes plus the
--                        person's extra minutes then, and deadline_at
--                        started_at + allowed_minutes: none of these four ever
--                        change (a trigger refuses), so a later extension or a
--                        reissued link never moves a running clock. Only
--                        attempt 1 is used for now; more are for a later
--                        "reset test". submitted_at and submit_kind are
--                        filled by H08.
--    hiring_events       what happened to each invitation, for reports:
--                        link opened (first time per link), attempt started
--                        or resumed, and later submitted, reviewed, decided,
--                        shared. Written in the same statement as the change
--                        it records; op_key makes a retried write land once.
--                        Rows are never edited; they go only when their
--                        company is removed. No IP addresses, no email-open
--                        pixels.
--
--  batch_candidates gains unique (id, batch_id) so an attempt's candidate
--  must belong to the attempt's batch, and the batch to the company.
--
--  Adds two tables the previous release never reads, so it is safe while
--  that release is live.
--
--  Idempotent: safe to run more than once.
-- ─────────────────────────────────────────────────────────────

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'batch_candidates_id_batch') then
    alter table course.batch_candidates add constraint batch_candidates_id_batch unique (id, batch_id);
  end if;
end
$$;

create table if not exists course.candidate_attempts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  batch_id uuid not null,
  candidate_id uuid not null,
  constraint candidate_attempts_batch
    foreign key (batch_id, company_id) references course.hiring_batches (id, company_id) on delete cascade,
  constraint candidate_attempts_candidate
    foreign key (candidate_id, batch_id) references course.batch_candidates (id, batch_id) on delete cascade,
  attempt_no integer not null default 1 constraint candidate_attempts_attempt_no check (attempt_no >= 1),
  version_id uuid not null references course.assessment_versions (id),
  allowed_minutes integer not null constraint candidate_attempts_allowed_minutes check (allowed_minutes between 5 and 960),
  started_at timestamptz not null default now(),
  deadline_at timestamptz not null,
  constraint candidate_attempts_deadline check (deadline_at = started_at + make_interval(mins => allowed_minutes)),
  -- The link generation they started from; a newer link resumes the same attempt.
  started_link_generation integer not null constraint candidate_attempts_generation check (started_link_generation >= 1),
  -- A short code the candidate can quote; shown on their receipt (H08).
  receipt text not null default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10))
    constraint candidate_attempts_receipt check (receipt ~ '^[0-9A-F]{10}$'),
  submitted_at timestamptz,
  submit_kind text constraint candidate_attempts_submit_kind check (submit_kind is null or submit_kind in ('candidate', 'deadline')),
  constraint candidate_attempts_submitted_pair check ((submitted_at is null) = (submit_kind is null)),
  constraint candidate_attempts_once unique (candidate_id, attempt_no)
);

create index if not exists candidate_attempts_batch_idx on course.candidate_attempts (batch_id);

-- The start and its clock never move. Deletion is left to the cascades from a removed company or batch.
create or replace function course.candidate_attempts_clock_fixed() returns trigger
language plpgsql as $$
begin
  if new.id <> old.id or new.company_id <> old.company_id or new.batch_id <> old.batch_id or new.candidate_id <> old.candidate_id
     or new.attempt_no <> old.attempt_no or new.version_id <> old.version_id or new.allowed_minutes <> old.allowed_minutes
     or new.started_at <> old.started_at or new.deadline_at <> old.deadline_at
     or new.started_link_generation <> old.started_link_generation or new.receipt <> old.receipt then
    raise exception 'an attempt''s start and clock cannot be changed' using errcode = 'P0001';
  end if;
  if old.submitted_at is not null and (new.submitted_at is distinct from old.submitted_at or new.submit_kind is distinct from old.submit_kind) then
    raise exception 'a submitted attempt cannot be changed' using errcode = 'P0001';
  end if;
  return new;
end
$$;

drop trigger if exists candidate_attempts_clock_fixed on course.candidate_attempts;
create trigger candidate_attempts_clock_fixed
  before update on course.candidate_attempts
  for each row execute function course.candidate_attempts_clock_fixed();

create table if not exists course.hiring_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references course.companies (id) on delete cascade,
  batch_id uuid not null,
  candidate_id uuid not null,
  constraint hiring_events_candidate
    foreign key (candidate_id, batch_id) references course.batch_candidates (id, batch_id) on delete cascade,
  attempt_id uuid references course.candidate_attempts (id) on delete cascade,
  kind text not null constraint hiring_events_kind check (kind in (
    'link_opened', 'attempt_started', 'attempt_resumed', 'submitted', 'auto_submitted',
    'review_completed', 'decision_recorded', 'result_shared'
  )),
  actor_kind text not null constraint hiring_events_actor_kind check (actor_kind in ('candidate', 'recruiter', 'reviewer', 'system')),
  -- A company member's email; null for the candidate and the system.
  actor_email text constraint hiring_events_actor_email check (actor_email is null or actor_email = lower(actor_email)),
  -- Small facts about the event (the link generation, a decision); never answers or names.
  detail jsonb not null default '{}' constraint hiring_events_detail check (jsonb_typeof(detail) = 'object'),
  at timestamptz not null default now(),
  -- One logical event: a retried write with the same key records nothing more.
  op_key text not null constraint hiring_events_op_key check (char_length(op_key) between 1 and 200),
  constraint hiring_events_once unique (op_key)
);

create index if not exists hiring_events_batch_idx on course.hiring_events (batch_id, at);
create index if not exists hiring_events_company_idx on course.hiring_events (company_id, at);

-- Events are never edited. (Deletion is left to the cascades from a removed company.)
create or replace function course.hiring_events_no_edit() returns trigger
language plpgsql as $$
begin
  raise exception 'hiring_events is append-only' using errcode = 'P0001';
end
$$;

drop trigger if exists hiring_events_no_edit on course.hiring_events;
create trigger hiring_events_no_edit
  before update on course.hiring_events
  for each row execute function course.hiring_events_no_edit();
