-- ─────────────────────────────────────────────────────────────
--  Attempt submissions: the candidate's final answer, frozen
--  (H08 of the hiring plan, H05_PROPOSAL; D2: A)
--
--    attempt_submissions  one row per submitted attempt: a copy of the
--                         saved answer and the list of attached files at
--                         that moment, how it was submitted (by the
--                         candidate, or at the time limit with whatever was
--                         saved) and when. The primary key on attempt_id
--                         makes a repeated submit record once. Rows are
--                         never edited, and go only with their attempt.
--    submit_attempt()     the one way to submit. It locks the draft and the
--                         files first and the attempt after, then reads them
--                         again, so a save or an upload that lands while it
--                         waits is in the submission, and one that comes
--                         after is refused. In the same transaction it marks
--                         the attempt submitted, freezes its files and
--                         writes the hiring event. 'candidate' needs the
--                         person's current link, still invited, before the
--                         deadline plus the 30 s save grace; 'deadline'
--                         needs that grace to be over (the server calls it
--                         lazily when anyone next opens the attempt or its
--                         batch, so no cron is needed).
--
--  Drafts and files of a submitted attempt can no longer be added, changed
--  or removed (a trigger checks the attempt, under a share lock, so this
--  holds even when a save races the submit). Removal by a cascade from a
--  removed company or batch still works.
--
--  Adds a table and a function the previous release never reads, and
--  triggers that only refuse writes to submitted attempts, which that
--  release can't make; safe while it is live.
--
--  Idempotent: safe to run more than once.
-- ─────────────────────────────────────────────────────────────

create table if not exists course.attempt_submissions (
  attempt_id uuid primary key references course.candidate_attempts (id) on delete cascade,
  company_id uuid not null references course.companies (id) on delete cascade,
  answer text not null default '' constraint attempt_submissions_answer check (char_length(answer) <= 60000),
  -- The draft revision copied (0 when nothing was ever saved).
  draft_revision integer not null constraint attempt_submissions_revision check (draft_revision >= 0),
  file_ids uuid[] not null default '{}' constraint attempt_submissions_files check (cardinality(file_ids) <= 3),
  kind text not null constraint attempt_submissions_kind check (kind in ('candidate', 'deadline')),
  submitted_at timestamptz not null default now()
);

create index if not exists attempt_submissions_company_idx on course.attempt_submissions (company_id);

-- A submission is evidence: never edited, and only removed with its attempt.
create or replace function course.attempt_submissions_fixed() returns trigger
language plpgsql as $$
begin
  if tg_op = 'UPDATE' then
    raise exception 'a submission cannot be changed' using errcode = 'P0001';
  end if;
  -- pg_trigger_depth() = 1 is a direct delete; a cascade runs deeper.
  if tg_op = 'DELETE' and pg_trigger_depth() = 1 then
    raise exception 'a submission is removed only with its attempt' using errcode = 'P0001';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end
$$;

drop trigger if exists attempt_submissions_fixed on course.attempt_submissions;
create trigger attempt_submissions_fixed
  before update or delete on course.attempt_submissions
  for each row execute function course.attempt_submissions_fixed();

-- Drafts and files of a submitted attempt are closed. The share lock waits for a
-- submit in progress, so a racing save either lands before it or is refused.
create or replace function course.attempt_work_open() returns trigger
language plpgsql as $$
declare
  done timestamptz;
  target uuid := case when tg_op = 'DELETE' then old.attempt_id else new.attempt_id end;
begin
  if tg_op = 'DELETE' and pg_trigger_depth() > 1 then
    return old;
  end if;
  select a.submitted_at into done from course.candidate_attempts a where a.id = target for share;
  if done is not null then
    raise exception 'this attempt is submitted' using errcode = 'P0001', hint = 'attempt_submitted';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end
$$;

drop trigger if exists attempt_drafts_open on course.attempt_drafts;
create trigger attempt_drafts_open
  before insert or update on course.attempt_drafts
  for each row execute function course.attempt_work_open();

drop trigger if exists attempt_files_open on course.attempt_files;
create trigger attempt_files_open
  before insert or delete on course.attempt_files
  for each row execute function course.attempt_work_open();

/*
 * Submits an attempt. Returns one row: status is 'submitted' (this call did
 * it), 'already' (it was submitted before), 'stale' (the candidate's page
 * shows an older answer than the one saved), 'closed' (too late, or for
 * 'deadline' too early) or 'refused' (not this link's attempt, or no longer
 * invited). Locks: draft, then files, then the attempt, the same order a
 * save or an upload takes them, so the two never deadlock.
 */
create or replace function course.submit_attempt(
  p_attempt uuid,
  p_kind text,
  p_candidate uuid default null,
  p_generation integer default null,
  p_revision integer default null,
  p_grace_seconds integer default 30
) returns table (status text, receipt text, submitted_at timestamptz, submit_kind text)
language plpgsql as $$
#variable_conflict use_column
declare
  a record;
  d record;
  ids uuid[];
begin
  if p_kind not in ('candidate', 'deadline') then
    raise exception 'unknown submit kind %', p_kind;
  end if;

  perform 1 from course.attempt_drafts x where x.attempt_id = p_attempt for update;
  perform 1 from course.attempt_files x where x.attempt_id = p_attempt order by x.slot for update;

  select t.id, t.company_id, t.batch_id, t.candidate_id, t.deadline_at, t.receipt, t.submitted_at, t.submit_kind,
         c.link_generation, c.status as candidate_status, b.status as batch_status
    into a
    from course.candidate_attempts t
    join course.batch_candidates c on c.id = t.candidate_id and c.batch_id = t.batch_id
    join course.hiring_batches b on b.id = c.batch_id and b.company_id = c.company_id
   where t.id = p_attempt
     and (p_candidate is null or t.candidate_id = p_candidate)
     for update of t;

  if not found
     or (p_kind = 'candidate' and (p_candidate is null or a.link_generation is distinct from p_generation))
     or a.candidate_status <> 'active' or a.batch_status <> 'sent' then
    return query select 'refused'::text, null::text, null::timestamptz, null::text;
    return;
  end if;
  if a.submitted_at is not null then
    return query select 'already'::text, a.receipt, a.submitted_at, a.submit_kind;
    return;
  end if;
  if p_kind = 'candidate' and now() > a.deadline_at + make_interval(secs => p_grace_seconds) then
    return query select 'closed'::text, null::text, null::timestamptz, null::text;
    return;
  end if;
  if p_kind = 'deadline' and now() <= a.deadline_at + make_interval(secs => p_grace_seconds) then
    return query select 'closed'::text, null::text, null::timestamptz, null::text;
    return;
  end if;

  -- Read again now the attempt is locked: anything that landed while this waited is included.
  select x.answer, x.revision into d from course.attempt_drafts x where x.attempt_id = p_attempt;
  if p_revision is not null and coalesce(d.revision, 0) <> p_revision then
    return query select 'stale'::text, null::text, null::timestamptz, null::text;
    return;
  end if;
  select coalesce(array_agg(x.id order by x.slot), '{}') into ids from course.attempt_files x where x.attempt_id = p_attempt;

  insert into course.attempt_submissions (attempt_id, company_id, answer, draft_revision, file_ids, kind)
  values (p_attempt, a.company_id, coalesce(d.answer, ''), coalesce(d.revision, 0), ids, p_kind);
  update course.attempt_files x set stage = 'submitted' where x.attempt_id = p_attempt and x.stage = 'draft';
  update course.candidate_attempts t set submitted_at = now(), submit_kind = p_kind where t.id = p_attempt;
  insert into course.hiring_events (company_id, batch_id, candidate_id, attempt_id, kind, actor_kind, detail, op_key)
  values (a.company_id, a.batch_id, a.candidate_id, p_attempt,
          case when p_kind = 'candidate' then 'submitted' else 'auto_submitted' end,
          case when p_kind = 'candidate' then 'candidate' else 'system' end,
          jsonb_build_object('draft_revision', coalesce(d.revision, 0), 'files', cardinality(ids)),
          'submit:' || p_attempt)
  on conflict (op_key) do nothing;

  return query select 'submitted'::text, a.receipt, now(), p_kind;
end
$$;
