-- ─────────────────────────────────────────────────────────────
--  Attempt reviews: a company reviewer scores a submission against
--  the test's pinned rubric (H09 of the hiring plan, H05_PROPOSAL; D5: A)
--
--    attempt_reviews  append-only: one row per completed review of a
--                     submitted attempt. revision 1, 2, … per attempt; the
--                     newest counts and older ones stay as history. Holds
--                     who reviewed, the version whose rubric was used (the
--                     attempt's own, pinned at Start), each criterion's
--                     points out of its maximum with a note, the total, the
--                     maximum and a summary. A score never decides anything:
--                     decisions are H10's, made by people.
--    record_review()  the one way to write a review. It checks, in the same
--                     transaction: the attempt is this company's and
--                     submitted; the reviewer is a member of the company with
--                     the reviewer role now; every criterion of the pinned
--                     rubric is scored with whole points from 0 to its
--                     maximum, notes within 1000 characters; and the review
--                     builds on the latest one (two reviewers saving at once
--                     can't overwrite each other: the second is told). Total
--                     and maximum are computed here, never taken from the
--                     page. It writes the 'review_completed' hiring event.
--
--  Adds a table and a function the previous release never reads; safe
--  while it is live.
--
--  Idempotent: safe to run more than once.
-- ─────────────────────────────────────────────────────────────

create table if not exists course.attempt_reviews (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references course.companies (id) on delete cascade,
  attempt_id uuid not null references course.candidate_attempts (id) on delete cascade,
  revision integer not null constraint attempt_reviews_revision check (revision >= 1),
  reviewer_email text not null constraint attempt_reviews_reviewer check (reviewer_email = lower(reviewer_email) and char_length(reviewer_email) between 3 and 320),
  version_id uuid not null references course.assessment_versions (id),
  -- [{title, points, max, note}], in the rubric's order.
  scores jsonb not null constraint attempt_reviews_scores check (jsonb_typeof(scores) = 'array' and jsonb_array_length(scores) between 1 and 10),
  total integer not null,
  max integer not null,
  constraint attempt_reviews_total check (max between 1 and 100 and total between 0 and max),
  summary text not null default '' constraint attempt_reviews_summary check (char_length(summary) <= 2000),
  completed_at timestamptz not null default now(),
  constraint attempt_reviews_once unique (attempt_id, revision)
);

create index if not exists attempt_reviews_company_idx on course.attempt_reviews (company_id);

-- A review is a record: never edited (a change is a new revision), and only removed with its attempt.
create or replace function course.attempt_reviews_fixed() returns trigger
language plpgsql as $$
begin
  if tg_op = 'UPDATE' then
    raise exception 'a review cannot be changed; record a new revision' using errcode = 'P0001';
  end if;
  if tg_op = 'DELETE' and pg_trigger_depth() = 1 then
    raise exception 'a review is removed only with its attempt' using errcode = 'P0001';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end
$$;

drop trigger if exists attempt_reviews_fixed on course.attempt_reviews;
create trigger attempt_reviews_fixed
  before update or delete on course.attempt_reviews
  for each row execute function course.attempt_reviews_fixed();

/*
 * Records a review. p_scores is [{points, note}] in the rubric's order.
 * Returns one row: status 'recorded' (with the new revision, total, max),
 * 'conflict' (someone recorded a newer review since p_base_revision),
 * 'invalid' (doesn't match the rubric), 'not_submitted', or 'refused' (not
 * this company's attempt, or not a reviewer here).
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
  item jsonb;
  given jsonb;
  pts numeric;
  note text;
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

  select v.rubric into rubric from course.assessment_versions v where v.id = a.version_id;
  if jsonb_typeof(p_scores) is distinct from 'array' or jsonb_array_length(p_scores) <> jsonb_array_length(rubric)
     or p_summary is null or char_length(p_summary) > 2000 then
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
