-- ─────────────────────────────────────────────────────────────
--  A company admin holds every power in their company (decided by the user
--  25 Nov 2026): they may record hiring decisions and share results, score
--  and review submissions, and be named a round's reviewer. The app treats
--  admin as every role (hasRole); these are the database's own checks.
--
--    may_decide()     recruiter, company head, or admin.
--    record_review()  as in 0067, with reviewer or admin.
--
--  Same arguments and results; the previous release calls both unchanged.
--  Audit records still name who acted. Idempotent.
-- ─────────────────────────────────────────────────────────────

create or replace function course.may_decide(p_company uuid, p_email text) returns boolean
language sql stable as $$
  select exists (
    select 1 from course.company_member_roles r
      join course.company_members cm on cm.company_id = r.company_id and cm.email = r.email
     where r.company_id = p_company and r.email = lower(p_email) and r.role in ('recruiter', 'company_head', 'admin')
  )
$$;

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
     where r.company_id = p_company and r.email = lower(p_reviewer) and r.role in ('reviewer', 'admin')
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
