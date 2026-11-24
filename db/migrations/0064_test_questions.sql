-- ─────────────────────────────────────────────────────────────
--  Tests with several questions, multiple choice included (L2 of the B2B
--  plan, LIBRARY_PROPOSAL.txt and U04B_PROPOSAL.txt, approved 24 Nov)
--
--    assessment_versions.questions  null: the one-task test as before. Set:
--                                   1 to 20 questions frozen with the
--                                   version, checked in full by the app;
--                                   the version's own task and rubric are
--                                   then empty.
--    attempt_answers                one row per question a candidate has
--                                   touched: the written answer, or the
--                                   options picked (indexes from 0), each
--                                   with its own revision, so two tabs on
--                                   different questions never clash.
--    attempt_files.question_no      the question a file belongs to (null:
--                                   the one-task test). Up to 3 per
--                                   question.
--    attempt_submissions.answers    every question's answer, picks and
--                                   file ids, frozen at Submit.
--    submit_attempt                 replaced: also freezes the answers.
--
--  The previous release never reads the new columns or table; it inserts
--  files without a question, which the new slot rule still allows, and
--  calls submit_attempt with the same arguments. Idempotent.
-- ─────────────────────────────────────────────────────────────

alter table course.assessment_versions add column if not exists questions jsonb;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'assessment_versions_questions') then
    alter table course.assessment_versions add constraint assessment_versions_questions
      check (questions is null or (jsonb_typeof(questions) = 'array' and jsonb_array_length(questions) between 1 and 20));
  end if;
  -- A test with questions keeps its task and rubric in them.
  if exists (select 1 from pg_constraint where conname = 'assessment_versions_task_title' and pg_get_constraintdef(oid) not like '%questions%') then
    alter table course.assessment_versions drop constraint assessment_versions_task_title;
    alter table course.assessment_versions add constraint assessment_versions_task_title
      check (char_length(task_title) <= 160 and (questions is not null or char_length(task_title) >= 1));
  end if;
  if exists (select 1 from pg_constraint where conname = 'assessment_versions_task_brief' and pg_get_constraintdef(oid) not like '%questions%') then
    alter table course.assessment_versions drop constraint assessment_versions_task_brief;
    alter table course.assessment_versions add constraint assessment_versions_task_brief
      check (char_length(task_brief) <= 6000 and (questions is not null or char_length(task_brief) >= 1));
  end if;
  if exists (select 1 from pg_constraint where conname = 'assessment_versions_rubric' and pg_get_constraintdef(oid) not like '%questions%') then
    alter table course.assessment_versions drop constraint assessment_versions_rubric;
    alter table course.assessment_versions add constraint assessment_versions_rubric
      check (jsonb_typeof(rubric) = 'array' and jsonb_array_length(rubric) <= 10 and (questions is not null or jsonb_array_length(rubric) >= 1));
  end if;
end
$$;

create table if not exists course.attempt_answers (
  attempt_id uuid not null references course.candidate_attempts (id) on delete cascade,
  question_no smallint not null constraint attempt_answers_question check (question_no between 1 and 20),
  revision integer not null constraint attempt_answers_revision check (revision >= 1),
  answer text not null default '' constraint attempt_answers_answer check (char_length(answer) <= 60000),
  picked smallint[] not null default '{}' constraint attempt_answers_picked check (cardinality(picked) <= 8),
  saved_at timestamptz not null default now(),
  primary key (attempt_id, question_no)
);

-- No answer changes once the attempt is submitted (the same rule drafts and files follow).
drop trigger if exists attempt_answers_open on course.attempt_answers;
create trigger attempt_answers_open
  before insert or update on course.attempt_answers
  for each row execute function course.attempt_work_open();

alter table course.attempt_files add column if not exists question_no smallint;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'attempt_files_question') then
    alter table course.attempt_files add constraint attempt_files_question check (question_no is null or question_no between 1 and 20);
  end if;
  -- Three files per question now, not three per attempt.
  if exists (select 1 from pg_constraint where conname = 'attempt_files_slot_once') then
    alter table course.attempt_files drop constraint attempt_files_slot_once;
  end if;
end
$$;

create unique index if not exists attempt_files_slot_once on course.attempt_files (attempt_id, coalesce(question_no, 0), slot);

alter table course.attempt_submissions add column if not exists answers jsonb;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'attempt_submissions_answers') then
    alter table course.attempt_submissions add constraint attempt_submissions_answers
      check (answers is null or jsonb_typeof(answers) = 'array');
  end if;
  -- file_ids holds every file of the attempt: up to 3 per question.
  if exists (select 1 from pg_constraint where conname = 'attempt_submissions_files' and pg_get_constraintdef(oid) like '%<= 3%') then
    alter table course.attempt_submissions drop constraint attempt_submissions_files;
    alter table course.attempt_submissions add constraint attempt_submissions_files check (cardinality(file_ids) <= 60);
  end if;
end
$$;

/*
 * As in 0057, and also: locks the question answers with the draft and files,
 * and freezes them into attempt_submissions.answers — one entry per question
 * that has an answer, picks or files: { question_no, answer, picked,
 * file_ids }. Null for a one-task test with nothing per question.
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
begin
  if p_kind not in ('candidate', 'deadline') then
    raise exception 'unknown submit kind %', p_kind;
  end if;
  perform 1 from course.attempt_drafts x where x.attempt_id = p_attempt for update;
  perform 1 from course.attempt_answers x where x.attempt_id = p_attempt order by x.question_no for update;
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
  done_at := case when p_kind = 'deadline' then a.deadline_at else now() end;
  insert into course.attempt_submissions (attempt_id, company_id, answer, draft_revision, file_ids, kind, submitted_at, answers)
  values (p_attempt, a.company_id, coalesce(d.answer, ''), coalesce(d.revision, 0), ids, p_kind, done_at, per);
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
