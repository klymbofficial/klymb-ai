-- ─────────────────────────────────────────────────────────────
--  Submitted at the time limit means at the time limit (H08 fix to 0056)
--
--  An attempt nobody submitted is finalised when someone next looks, which
--  can be hours after its time ran out. Its submitted_at is now the deadline
--  it ran out at, not the moment it was finalised: the work is what was
--  saved by then, and the candidate's receipt and the recruiter's table
--  should say so. When it was finalised stays in hiring_events.at.
--
--  Replaces one function; the previous release never calls it.
--
--  Idempotent: safe to run more than once.
-- ─────────────────────────────────────────────────────────────

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
  done_at timestamptz;
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

  done_at := case when p_kind = 'deadline' then a.deadline_at else now() end;
  insert into course.attempt_submissions (attempt_id, company_id, answer, draft_revision, file_ids, kind, submitted_at)
  values (p_attempt, a.company_id, coalesce(d.answer, ''), coalesce(d.revision, 0), ids, p_kind, done_at);
  update course.attempt_files x set stage = 'submitted' where x.attempt_id = p_attempt and x.stage = 'draft';
  update course.candidate_attempts t set submitted_at = done_at, submit_kind = p_kind where t.id = p_attempt;
  insert into course.hiring_events (company_id, batch_id, candidate_id, attempt_id, kind, actor_kind, detail, op_key)
  values (a.company_id, a.batch_id, a.candidate_id, p_attempt,
          case when p_kind = 'candidate' then 'submitted' else 'auto_submitted' end,
          case when p_kind = 'candidate' then 'candidate' else 'system' end,
          jsonb_build_object('draft_revision', coalesce(d.revision, 0), 'files', cardinality(ids)),
          'submit:' || p_attempt)
  on conflict (op_key) do nothing;

  return query select 'submitted'::text, a.receipt, done_at, p_kind;
end
$$;
