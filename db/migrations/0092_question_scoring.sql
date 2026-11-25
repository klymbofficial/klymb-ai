-- ─────────────────────────────────────────────────────────────
--  Scoring tests with questions (L3 of the B2B plan, LIBRARY_PROPOSAL.txt
--  point 5, approved 24 Nov: multiple choice marked automatically, a
--  person confirms; partial marks for several-correct questions, never
--  below zero)
--
--    mcq_points()                    one multiple-choice question's marks
--                                    for the options picked, from the
--                                    question as frozen in the version:
--                                    exactly the right options = full
--                                    points; several right with partial on
--                                    = points × (right − wrong) ÷ right
--                                    count, rounded down, never below 0;
--                                    anything else 0.
--    attempt_submissions.auto_scores every multiple-choice question's mark,
--                                    worked out on the server at Submit
--                                    (by the candidate or at the time
--                                    limit): [{question_no, points, max}].
--                                    Null for a test without multiple
--                                    choice and for work submitted before
--                                    this release. A mark, not a review.
--    submit_attempt                  replaced: also freezes auto_scores.
--    record_review                   replaced: a test with questions is
--                                    scored question by question — one
--                                    entry per multiple-choice question
--                                    and one per rubric area of a written
--                                    question, in order. A multiple-choice
--                                    mark that differs from the automatic
--                                    one needs a reason. The one-task test
--                                    is scored exactly as before.
--    attempt_reviews limits          up to 200 entries and 2000 points
--                                    (20 questions × 100), was 10 and 100.
--
--  The previous release never reads auto_scores, calls both functions with
--  the same arguments, and writes reviews within the old limits. Idempotent.
-- ─────────────────────────────────────────────────────────────

create or replace function course.mcq_points(q jsonb, picked smallint[]) returns integer
language sql immutable as $$
  with o as (
    select (t.ord - 1)::int as i, coalesce((t.x ->> 'correct')::boolean, false) as c
      from jsonb_array_elements(case when jsonb_typeof(q -> 'mcq' -> 'options') = 'array' then q -> 'mcq' -> 'options' else '[]'::jsonb end)
           with ordinality as t(x, ord)
  ),
  p as (select distinct x::int as i from unnest(coalesce(picked, '{}'::smallint[])) as x),
  s as (
    select (select count(*) from o where o.c) as correct,
           (select count(*) from p join o on o.i = p.i where o.c) as right_n,
           (select count(*) from p left join o on o.i = p.i where o.c is not true) as wrong_n,
           coalesce((q -> 'mcq' ->> 'points')::int, 0) as pts,
           coalesce((q -> 'mcq' ->> 'partial')::boolean, false) as partial
  )
  select case
           when q -> 'mcq' is null or jsonb_typeof(q -> 'mcq') <> 'object' then null
           when s.correct = 0 then 0
           when s.right_n = s.correct and s.wrong_n = 0 then s.pts
           when s.correct > 1 and s.partial then greatest(0, floor(s.pts * (s.right_n - s.wrong_n)::numeric / s.correct))::int
           else 0
         end
    from s
$$;

alter table course.attempt_submissions add column if not exists auto_scores jsonb;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'attempt_submissions_auto_scores') then
    alter table course.attempt_submissions add constraint attempt_submissions_auto_scores
      check (auto_scores is null or jsonb_typeof(auto_scores) = 'array');
  end if;
  if exists (select 1 from pg_constraint where conname = 'attempt_reviews_scores' and pg_get_constraintdef(oid) like '%10)%') then
    alter table course.attempt_reviews drop constraint attempt_reviews_scores;
    alter table course.attempt_reviews add constraint attempt_reviews_scores
      check (jsonb_typeof(scores) = 'array' and jsonb_array_length(scores) between 1 and 200);
  end if;
  if exists (select 1 from pg_constraint where conname = 'attempt_reviews_total' and pg_get_constraintdef(oid) like '%100)%') then
    alter table course.attempt_reviews drop constraint attempt_reviews_total;
    alter table course.attempt_reviews add constraint attempt_reviews_total
      check (max between 1 and 2000 and total between 0 and max);
  end if;
end
$$;

/*
 * As in 0064, and also: marks every multiple-choice question of the
 * attempt's pinned version from the answers being frozen, into
 * attempt_submissions.auto_scores.
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
  done_at timestamptz;
  per jsonb;
  auto jsonb;
begin
  if p_kind not in ('candidate', 'deadline') then
    raise exception 'unknown submit kind %', p_kind;
  end if;
  perform 1 from course.attempt_drafts x where x.attempt_id = p_attempt for update;
  perform 1 from course.attempt_answers x where x.attempt_id = p_attempt order by x.question_no for update;
  perform 1 from course.attempt_files x where x.attempt_id = p_attempt order by x.slot for update;
  select t.id, t.company_id, t.batch_id, t.candidate_id, t.version_id, t.deadline_at, t.receipt, t.submitted_at, t.submit_kind,
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
  select coalesce(array_agg(x.id order by coalesce(x.question_no, 0), x.slot), '{}') into ids from course.attempt_files x where x.attempt_id = p_attempt;
  select jsonb_agg(jsonb_build_object(
           'question_no', q.n,
           'answer', coalesce(w.answer, ''),
           'picked', to_jsonb(coalesce(w.picked, '{}'::smallint[])),
           'file_ids', coalesce((select jsonb_agg(f.id order by f.slot) from course.attempt_files f where f.attempt_id = p_attempt and f.question_no = q.n), '[]'::jsonb)
         ) order by q.n)
    into per
    from (
      select w.question_no as n from course.attempt_answers w where w.attempt_id = p_attempt
      union
      select f.question_no from course.attempt_files f where f.attempt_id = p_attempt and f.question_no is not null
    ) q
    left join course.attempt_answers w on w.attempt_id = p_attempt and w.question_no = q.n;
  -- Every multiple-choice question is marked, answered or not, from the version pinned at Start.
  select jsonb_agg(jsonb_build_object(
           'question_no', qq.ord,
           'points', course.mcq_points(qq.q, coalesce(w.picked, '{}'::smallint[])),
           'max', coalesce((qq.q -> 'mcq' ->> 'points')::int, 0)
         ) order by qq.ord)
    into auto
    from course.assessment_versions v
    cross join lateral jsonb_array_elements(case when jsonb_typeof(v.questions) = 'array' then v.questions else '[]'::jsonb end) with ordinality as qq(q, ord)
    left join course.attempt_answers w on w.attempt_id = p_attempt and w.question_no = qq.ord
   where v.id = a.version_id and jsonb_typeof(qq.q -> 'mcq') = 'object';
  done_at := case when p_kind = 'deadline' then a.deadline_at else now() end;
  insert into course.attempt_submissions (attempt_id, company_id, answer, draft_revision, file_ids, kind, submitted_at, answers, auto_scores)
  values (p_attempt, a.company_id, coalesce(d.answer, ''), coalesce(d.revision, 0), ids, p_kind, done_at, per, auto);
  update course.attempt_files x set stage = 'submitted' where x.attempt_id = p_attempt and x.stage = 'draft';
  update course.candidate_attempts t set submitted_at = done_at, submit_kind = p_kind where t.id = p_attempt;
  insert into course.hiring_events (company_id, batch_id, candidate_id, attempt_id, kind, actor_kind, detail, op_key)
  values (a.company_id, a.batch_id, a.candidate_id, p_attempt,
          case when p_kind = 'candidate' then 'submitted' else 'auto_submitted' end,
          case when p_kind = 'candidate' then 'candidate' else 'system' end,
          jsonb_build_object('draft_revision', coalesce(d.revision, 0), 'files', cardinality(ids), 'answers', coalesce(jsonb_array_length(per), 0)),
          'submit:' || p_attempt)
  on conflict (op_key) do nothing;
  return query select 'submitted'::text, a.receipt, done_at, p_kind;
end
$$;

/*
 * As in 0058 for a one-task test. For a test with questions, p_scores is
 * [{points, note}] with one entry per multiple-choice question and one per
 * rubric area of every other question, in question order. Each entry is
 * stored as {question_no, question, title, points, max, note} plus, for
 * multiple choice, auto: the mark worked out from the frozen answer. A
 * multiple-choice entry whose points differ from auto must have a note
 * (the reason); otherwise 'invalid'.
 */
create or replace function course.record_review(
  p_company uuid,
  p_attempt uuid,
  p_reviewer text,
  p_base_revision integer,
  p_scores jsonb,
  p_summary text
) returns table (status text, revision integer, total integer, max integer)
language plpgsql as $$
#variable_conflict use_column
declare
  a record;
  rubric jsonb;
  qs jsonb;
  frozen jsonb;
  item jsonb;
  given jsonb;
  q jsonb;
  area jsonb;
  picked smallint[];
  auto integer;
  pts numeric;
  top integer;
  note text;
  k integer := 0;
  expected integer := 0;
  out_scores jsonb := '[]'::jsonb;
  t integer := 0;
  m integer := 0;
  latest integer;
  made integer;
begin
  select x.id, x.company_id, x.batch_id, x.candidate_id, x.version_id, x.submitted_at into a
    from course.candidate_attempts x where x.id = p_attempt and x.company_id = p_company;
  if not found or not exists (
    select 1 from course.company_member_roles r
      join course.company_members cm on cm.company_id = r.company_id and cm.email = r.email
     where r.company_id = p_company and r.email = lower(p_reviewer) and r.role = 'reviewer'
  ) then
    return query select 'refused'::text, null::int, null::int, null::int;
    return;
  end if;
  if a.submitted_at is null then
    return query select 'not_submitted'::text, null::int, null::int, null::int;
    return;
  end if;

  select v.rubric, v.questions into rubric, qs from course.assessment_versions v where v.id = a.version_id;
  if jsonb_typeof(p_scores) is distinct from 'array' or p_summary is null or char_length(p_summary) > 2000 then
    return query select 'invalid'::text, null::int, null::int, null::int;
    return;
  end if;

  if jsonb_typeof(qs) = 'array' and jsonb_array_length(qs) > 0 then
    select s.answers into frozen from course.attempt_submissions s where s.attempt_id = p_attempt;
    for i in 0 .. jsonb_array_length(qs) - 1 loop
      q := qs -> i;
      expected := expected + case when jsonb_typeof(q -> 'mcq') = 'object' then 1 else greatest(jsonb_array_length(coalesce(q -> 'rubric', '[]'::jsonb)), 0) end;
    end loop;
    if jsonb_array_length(p_scores) <> expected then
      return query select 'invalid'::text, null::int, null::int, null::int;
      return;
    end if;
    for i in 0 .. jsonb_array_length(qs) - 1 loop
      q := qs -> i;
      if jsonb_typeof(q -> 'mcq') = 'object' then
        select coalesce(array_agg(e::smallint), '{}') into picked
          from jsonb_array_elements(coalesce(frozen, '[]'::jsonb)) f, jsonb_array_elements_text(coalesce(f -> 'picked', '[]'::jsonb)) e
         where (f ->> 'question_no')::int = i + 1;
        auto := course.mcq_points(q, picked);
        top := coalesce((q -> 'mcq' ->> 'points')::int, 0);
        given := p_scores -> k;
        k := k + 1;
        if jsonb_typeof(given -> 'points') is distinct from 'number' then
          return query select 'invalid'::text, null::int, null::int, null::int;
          return;
        end if;
        pts := (given ->> 'points')::numeric;
        note := btrim(coalesce(given ->> 'note', ''));
        if pts <> trunc(pts) or pts < 0 or pts > top or char_length(note) > 1000 or (pts::int <> auto and note = '') then
          return query select 'invalid'::text, null::int, null::int, null::int;
          return;
        end if;
        out_scores := out_scores || jsonb_build_array(jsonb_build_object(
          'question_no', i + 1, 'question', q ->> 'title', 'title', q ->> 'title',
          'points', pts::int, 'max', top, 'note', note, 'auto', auto));
        t := t + pts::int;
        m := m + top;
      else
        for j in 0 .. jsonb_array_length(coalesce(q -> 'rubric', '[]'::jsonb)) - 1 loop
          area := q -> 'rubric' -> j;
          given := p_scores -> k;
          k := k + 1;
          if jsonb_typeof(given -> 'points') is distinct from 'number' then
            return query select 'invalid'::text, null::int, null::int, null::int;
            return;
          end if;
          pts := (given ->> 'points')::numeric;
          note := coalesce(given ->> 'note', '');
          if pts <> trunc(pts) or pts < 0 or pts > (area ->> 'points')::int or char_length(note) > 1000 then
            return query select 'invalid'::text, null::int, null::int, null::int;
            return;
          end if;
          out_scores := out_scores || jsonb_build_array(jsonb_build_object(
            'question_no', i + 1, 'question', q ->> 'title', 'title', area ->> 'title',
            'points', pts::int, 'max', (area ->> 'points')::int, 'note', note));
          t := t + pts::int;
          m := m + (area ->> 'points')::int;
        end loop;
      end if;
    end loop;
    if m < 1 then
      return query select 'invalid'::text, null::int, null::int, null::int;
      return;
    end if;
  else
    if jsonb_array_length(p_scores) <> jsonb_array_length(rubric) then
      return query select 'invalid'::text, null::int, null::int, null::int;
      return;
    end if;
    for i in 0 .. jsonb_array_length(rubric) - 1 loop
      item := rubric -> i;
      given := p_scores -> i;
      if jsonb_typeof(given -> 'points') is distinct from 'number' then
        return query select 'invalid'::text, null::int, null::int, null::int;
        return;
      end if;
      pts := (given ->> 'points')::numeric;
      note := coalesce(given ->> 'note', '');
      if pts <> trunc(pts) or pts < 0 or pts > (item ->> 'points')::int or char_length(note) > 1000 then
        return query select 'invalid'::text, null::int, null::int, null::int;
        return;
      end if;
      out_scores := out_scores || jsonb_build_array(jsonb_build_object(
        'title', item ->> 'title', 'points', pts::int, 'max', (item ->> 'points')::int, 'note', note));
      t := t + pts::int;
      m := m + (item ->> 'points')::int;
    end loop;
  end if;

  select coalesce(max(r.revision), 0) into latest from course.attempt_reviews r where r.attempt_id = p_attempt;
  if latest <> p_base_revision then
    return query select 'conflict'::text, latest, null::int, null::int;
    return;
  end if;

  insert into course.attempt_reviews (company_id, attempt_id, revision, reviewer_email, version_id, scores, total, max, summary)
  values (p_company, p_attempt, p_base_revision + 1, lower(p_reviewer), a.version_id, out_scores, t, m, p_summary)
  on conflict (attempt_id, revision) do nothing
  returning attempt_reviews.revision into made;
  if made is null then
    return query select 'conflict'::text, p_base_revision + 1, null::int, null::int;
    return;
  end if;

  insert into course.hiring_events (company_id, batch_id, candidate_id, attempt_id, kind, actor_kind, actor_email, detail, op_key)
  values (p_company, a.batch_id, a.candidate_id, p_attempt, 'review_completed', 'reviewer', lower(p_reviewer),
          jsonb_build_object('revision', made, 'total', t, 'max', m), 'review:' || p_attempt || ':' || made)
  on conflict (op_key) do nothing;

  return query select 'recorded'::text, made, t, m;
end
$$;
