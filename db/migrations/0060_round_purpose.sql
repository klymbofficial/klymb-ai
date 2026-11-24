-- ─────────────────────────────────────────────────────────────
--  Hiring or internal rounds (U11 of the B2B plan, U11_PROPOSAL.txt,
--  approved 24 Nov: tests can go to colleagues inside the company)
--
--    hiring_batches.purpose  'hiring' (default: every existing round) or
--                            'internal'. An internal round is the same
--                            invitation, attempt, review and result sharing;
--                            it only never takes a hiring decision.
--    record_decision()       re-created from 0059 with one more check: on an
--                            internal round it answers 'internal' and writes
--                            nothing. Everything else is unchanged.
--
--  Adds a column with a default and replaces one function; the previous
--  release never reads the column, and its decision calls behave the same
--  for hiring rounds. Idempotent: safe to run more than once.
-- ─────────────────────────────────────────────────────────────

alter table course.hiring_batches add column if not exists purpose text not null default 'hiring';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'hiring_batches_purpose') then
    alter table course.hiring_batches add constraint hiring_batches_purpose check (purpose in ('hiring', 'internal'));
  end if;
end
$$;

/*
 * Records a decision. Returns one row: status 'recorded' (with the new
 * revision), 'conflict' (someone decided since p_base_revision; revision is
 * the newest), 'invalid', 'not_submitted', 'internal' (U11: an internal
 * round takes no hiring decision) or 'refused'.
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
  -- An internal round (colleagues, U11) is scored and reviewed, never shortlisted.
  if exists (select 1 from course.hiring_batches b where b.id = a.batch_id and b.purpose = 'internal') then
    return query select 'internal'::text, null::int;
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
