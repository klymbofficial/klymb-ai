-- ─────────────────────────────────────────────────────────────
--  Proctoring (decided by the user 25 Nov 2026): recruiters switch on, per
--  test, full screen, tab/window-switch detection, blocking copy / paste /
--  right-click, and webcam snapshots (with the candidate's consent). Each
--  full-screen exit or tab/window switch warns the candidate and is
--  recorded; an optional limit submits the test automatically when reached.
--
--    company_test_settings.proctor_*   the switches and the limit (1–20, or
--                                      null for no automatic submission).
--    attempt_events                    what happened during an attempt,
--                                      append-only, removed with it.
--    record_attempt_event()            the one way a candidate's page records
--                                      an event: checks the link and that the
--                                      attempt is open, counts warnings, and
--                                      at the limit submits the work as it
--                                      stands (as the candidate, from their
--                                      link) and notes why.
--    attempt_snapshots                 webcam photos kept in the private
--                                      attempt-file storage; reviewers only.
--
--  New table, columns and functions; the previous release reads none of
--  them. Idempotent.
-- ─────────────────────────────────────────────────────────────

alter table course.company_test_settings add column if not exists proctor_fullscreen boolean not null default false;
alter table course.company_test_settings add column if not exists proctor_tabs boolean not null default false;
alter table course.company_test_settings add column if not exists proctor_copy boolean not null default false;
alter table course.company_test_settings add column if not exists proctor_webcam boolean not null default false;
alter table course.company_test_settings add column if not exists proctor_limit integer;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'company_test_settings_proctor_limit') then
    alter table course.company_test_settings add constraint company_test_settings_proctor_limit
      check (proctor_limit is null or proctor_limit between 1 and 20);
  end if;
end
$$;

create table if not exists course.attempt_events (
  id bigint generated always as identity primary key,
  attempt_id uuid not null references course.candidate_attempts (id) on delete cascade,
  company_id uuid not null references course.companies (id) on delete cascade,
  kind text not null constraint attempt_events_kind check (kind in (
    'fullscreen_exit', 'tab_hidden', 'window_blur',
    'copy_blocked', 'paste_blocked', 'context_blocked',
    'webcam_consent', 'webcam_denied', 'webcam_lost', 'limit_submitted'
  )),
  at timestamptz not null default now()
);

create index if not exists attempt_events_attempt_idx on course.attempt_events (attempt_id, at);

-- Events are a record: never edited, removed only with their attempt.
create or replace function course.attempt_events_fixed() returns trigger
language plpgsql as $$
begin
  if tg_op = 'UPDATE' then
    raise exception 'an attempt event cannot be changed' using errcode = 'P0001';
  end if;
  if tg_op = 'DELETE' and pg_trigger_depth() = 1 then
    raise exception 'an attempt event is removed only with its attempt' using errcode = 'P0001';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end
$$;

drop trigger if exists attempt_events_fixed on course.attempt_events;
create trigger attempt_events_fixed
  before update or delete on course.attempt_events
  for each row execute function course.attempt_events_fixed();

create table if not exists course.attempt_snapshots (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references course.candidate_attempts (id) on delete cascade,
  company_id uuid not null references course.companies (id) on delete cascade,
  storage_key text not null unique,
  bytes integer not null check (bytes between 1 and 400000),
  taken_at timestamptz not null default now()
);

create index if not exists attempt_snapshots_attempt_idx on course.attempt_snapshots (attempt_id, taken_at);

/*
 * A candidate's page records one event. Returns one row: status 'recorded'
 * (with the warnings so far, the limit, and whether this submitted the test),
 * 'refused' (not this link's open attempt), 'closed' (submitted or out of
 * time) or 'too_many' (over 500 events). Warnings are full-screen exits and
 * tab or window switches; copy, paste and right-click are recorded only.
 */
create or replace function course.record_attempt_event(
  p_attempt uuid,
  p_candidate uuid,
  p_generation integer,
  p_kind text
) returns table (status text, warnings integer, warn_limit integer, submitted boolean)
language plpgsql as $$
#variable_conflict use_column
declare
  a record;
  lim integer;
  n integer;
  total integer;
  s record;
begin
  select t.id, t.company_id, t.batch_id, t.candidate_id, t.deadline_at, t.submitted_at, c.link_generation, c.status as c_status, b.status as b_status, b.item
    into a
    from course.candidate_attempts t
    join course.batch_candidates c on c.id = t.candidate_id and c.batch_id = t.batch_id
    join course.hiring_batches b on b.id = t.batch_id and b.company_id = t.company_id
   where t.id = p_attempt and t.candidate_id = p_candidate
     for update of t;
  if not found or a.link_generation is distinct from p_generation or a.c_status <> 'active' or a.b_status <> 'sent' then
    return query select 'refused'::text, null::int, null::int, false;
    return;
  end if;
  if a.submitted_at is not null or now() > a.deadline_at + interval '30 seconds' then
    return query select 'closed'::text, null::int, null::int, false;
    return;
  end if;
  select count(*) into total from course.attempt_events e where e.attempt_id = p_attempt;
  if total >= 500 then
    return query select 'too_many'::text, null::int, null::int, false;
    return;
  end if;

  insert into course.attempt_events (attempt_id, company_id, kind) values (p_attempt, a.company_id, p_kind);

  select x.proctor_limit into lim from course.company_test_settings x where x.company_id = a.company_id and x.item_slug = a.item;
  select count(*) into n from course.attempt_events e
   where e.attempt_id = p_attempt and e.kind in ('fullscreen_exit', 'tab_hidden', 'window_blur');

  if lim is not null and p_kind in ('fullscreen_exit', 'tab_hidden', 'window_blur') and n >= lim then
    select * into s from course.submit_attempt(p_attempt, 'candidate', p_candidate, p_generation, null, 30);
    if s.status in ('submitted', 'already') then
      insert into course.attempt_events (attempt_id, company_id, kind) values (p_attempt, a.company_id, 'limit_submitted');
      return query select 'recorded'::text, n, lim, true;
      return;
    end if;
  end if;
  return query select 'recorded'::text, n, lim, false;
end
$$;
