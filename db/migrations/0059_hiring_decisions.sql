-- ─────────────────────────────────────────────────────────────
--  Hiring decisions and result sharing (H10 of the hiring plan,
--  H05_PROPOSAL D6 + D7: A; user, 24 Nov: a decision may come before a
--  review, with a warning; a share shows the review version it was made
--  from, and sharing again is a new, deliberate press)
--
--    hiring_decisions  append-only: a recruiter's or company head's
--                      decision on a submitted attempt — shortlisted, not
--                      shortlisted or on hold — with a reason. revision 1,
--                      2, … per attempt; the newest counts and older ones
--                      stay as history. Records which review revision (if
--                      any) existed when it was made. A score never makes a
--                      decision: nothing here reads a total or a threshold.
--    record_decision() the one way to write one. Checks, in the same
--                      transaction: the attempt is this company's and
--                      submitted; the person is a member with the recruiter
--                      or company head role now; the decision and reason
--                      are valid; and it builds on the latest decision (two
--                      people deciding at once can't overwrite each other).
--                      Writes the 'decision_recorded' hiring event.
--    result_shares     append-only: each time a recruiter shares a reviewed
--                      result with the candidate, the review revision shown
--                      and the version's results policy at that moment
--                      (overall | by_area). One row per (attempt, review
--                      revision): pressing Share twice on the same review
--                      changes nothing. The candidate sees the newest share.
--    share_result()    the one way to share. Refused unless the person may
--                      decide (as above), the attempt is this company's and
--                      reviewed, and the pinned version's results policy
--                      isn't 'none'. Writes the 'result_shared' event.
--
--  Adds tables and functions the previous release never reads; safe while
--  it is live. Idempotent: safe to run more than once.
-- ─────────────────────────────────────────────────────────────

create table if not exists course.hiring_decisions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references course.companies (id) on delete cascade,
  attempt_id uuid not null references course.candidate_attempts (id) on delete cascade,
  revision integer not null constraint hiring_decisions_revision check (revision >= 1),
  decision text not null constraint hiring_decisions_decision check (decision in ('shortlisted', 'not_shortlisted', 'on_hold')),
  reason text not null constraint hiring_decisions_reason check (char_length(btrim(reason)) between 1 and 1000),
  -- The newest review revision when it was decided; null when nobody had reviewed it yet.
  review_revision integer constraint hiring_decisions_review_revision check (review_revision is null or review_revision >= 1),
  decided_by text not null constraint hiring_decisions_by check (decided_by = lower(decided_by) and char_length(decided_by) between 3 and 320),
  decided_at timestamptz not null default now(),
  constraint hiring_decisions_once unique (attempt_id, revision)
);

create index if not exists hiring_decisions_company_idx on course.hiring_decisions (company_id);

create table if not exists course.result_shares (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references course.companies (id) on delete cascade,
  attempt_id uuid not null references course.candidate_attempts (id) on delete cascade,
  review_revision integer not null constraint result_shares_review_revision check (review_revision >= 1),
  policy text not null constraint result_shares_policy check (policy in ('overall', 'by_area')),
  shared_by text not null constraint result_shares_by check (shared_by = lower(shared_by) and char_length(shared_by) between 3 and 320),
  shared_at timestamptz not null default now(),
  constraint result_shares_once unique (attempt_id, review_revision)
);

create index if not exists result_shares_company_idx on course.result_shares (company_id);

-- Both are records: never edited, and only removed with their attempt.
create or replace function course.hiring_records_fixed() returns trigger
language plpgsql as $$
begin
  if tg_op = 'UPDATE' then
    raise exception '% rows cannot be changed; record a new one', tg_table_name using errcode = 'P0001';
  end if;
  if tg_op = 'DELETE' and pg_trigger_depth() = 1 then
    raise exception '% rows are removed only with their attempt', tg_table_name using errcode = 'P0001';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end
$$;

drop trigger if exists hiring_decisions_fixed on course.hiring_decisions;
create trigger hiring_decisions_fixed
  before update or delete on course.hiring_decisions
  for each row execute function course.hiring_records_fixed();

drop trigger if exists result_shares_fixed on course.result_shares;
create trigger result_shares_fixed
  before update or delete on course.result_shares
  for each row execute function course.hiring_records_fixed();

-- True when this email is a member of the company with a role that decides (D6: recruiter or company head).
create or replace function course.may_decide(p_company uuid, p_email text) returns boolean
language sql stable as $$
  select exists (
    select 1 from course.company_member_roles r
      join course.company_members cm on cm.company_id = r.company_id and cm.email = r.email
     where r.company_id = p_company and r.email = lower(p_email) and r.role in ('recruiter', 'company_head')
  )
$$;

/*
 * Records a decision. Returns one row: status 'recorded' (with the new
 * revision), 'conflict' (someone decided since p_base_revision; revision is
 * the newest), 'invalid', 'not_submitted' or 'refused'.
 */
create or replace function course.record_decision(
  p_company uuid,
  p_attempt uuid,
  p_actor text,
  p_base_revision integer,
  p_decision text,
  p_reason text
) returns table (status text, revision integer)
language plpgsql as $$
#variable_conflict use_column
declare
  a record;
  latest integer;
  reviewed integer;
  made integer;
begin
  select x.id, x.batch_id, x.candidate_id, x.submitted_at into a
    from course.candidate_attempts x where x.id = p_attempt and x.company_id = p_company;
  if not found or not course.may_decide(p_company, p_actor) then
    return query select 'refused'::text, null::int;
    return;
  end if;
  if a.submitted_at is null then
    return query select 'not_submitted'::text, null::int;
    return;
  end if;
  if p_decision is null or p_decision not in ('shortlisted', 'not_shortlisted', 'on_hold')
     or p_reason is null or char_length(btrim(p_reason)) not between 1 and 1000 then
    return query select 'invalid'::text, null::int;
    return;
  end if;

  select coalesce(max(d.revision), 0) into latest from course.hiring_decisions d where d.attempt_id = p_attempt;
  if latest <> p_base_revision then
    return query select 'conflict'::text, latest;
    return;
  end if;
  select max(r.revision) into reviewed from course.attempt_reviews r where r.attempt_id = p_attempt;

  insert into course.hiring_decisions (company_id, attempt_id, revision, decision, reason, review_revision, decided_by)
  values (p_company, p_attempt, p_base_revision + 1, p_decision, btrim(p_reason), reviewed, lower(p_actor))
  on conflict (attempt_id, revision) do nothing
  returning hiring_decisions.revision into made;
  if made is null then
    return query select 'conflict'::text, p_base_revision + 1;
    return;
  end if;

  insert into course.hiring_events (company_id, batch_id, candidate_id, attempt_id, kind, actor_kind, actor_email, detail, op_key)
  values (p_company, a.batch_id, a.candidate_id, p_attempt, 'decision_recorded', 'recruiter', lower(p_actor),
          jsonb_build_object('revision', made, 'decision', p_decision, 'review_revision', reviewed), 'decision:' || p_attempt || ':' || made)
  on conflict (op_key) do nothing;

  return query select 'recorded'::text, made;
end
$$;

/*
 * Shares the newest review with the candidate. Returns one row: status
 * 'shared' or 'already' (this review revision was shared before) with the
 * review revision and policy, or 'not_reviewed', 'not_allowed' (the
 * version's policy is 'none'), or 'refused'.
 */
create or replace function course.share_result(
  p_company uuid,
  p_attempt uuid,
  p_actor text
) returns table (status text, review_revision integer, policy text)
language plpgsql as $$
#variable_conflict use_column
declare
  a record;
  pol text;
  rev integer;
  made uuid;
begin
  select x.id, x.batch_id, x.candidate_id, x.version_id into a
    from course.candidate_attempts x where x.id = p_attempt and x.company_id = p_company;
  if not found or not course.may_decide(p_company, p_actor) then
    return query select 'refused'::text, null::int, null::text;
    return;
  end if;
  select v.results into pol from course.assessment_versions v where v.id = a.version_id;
  if pol is distinct from 'overall' and pol is distinct from 'by_area' then
    return query select 'not_allowed'::text, null::int, pol;
    return;
  end if;
  select max(r.revision) into rev from course.attempt_reviews r where r.attempt_id = p_attempt and r.company_id = p_company;
  if rev is null then
    return query select 'not_reviewed'::text, null::int, pol;
    return;
  end if;

  insert into course.result_shares (company_id, attempt_id, review_revision, policy, shared_by)
  values (p_company, p_attempt, rev, pol, lower(p_actor))
  on conflict (attempt_id, review_revision) do nothing
  returning result_shares.id into made;
  if made is null then
    return query select 'already'::text, rev, pol;
    return;
  end if;

  insert into course.hiring_events (company_id, batch_id, candidate_id, attempt_id, kind, actor_kind, actor_email, detail, op_key)
  values (p_company, a.batch_id, a.candidate_id, p_attempt, 'result_shared', 'recruiter', lower(p_actor),
          jsonb_build_object('review_revision', rev, 'policy', pol), 'share:' || p_attempt || ':' || rev)
  on conflict (op_key) do nothing;

  return query select 'shared'::text, rev, pol;
end
$$;
