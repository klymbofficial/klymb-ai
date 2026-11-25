-- ─────────────────────────────────────────────────────────────
--  Sections and several questions in a test's draft (U04b-1 of the B2B
--  plan, U04B_PROPOSAL.txt, approved 24 Nov)
--
--    assessment_drafts.questions  null: the one-task test as before
--                                 (task_title, task_brief, submission,
--                                 rubric). Set: 1 to 20 questions, each
--                                 { section, title, brief, submission,
--                                 rubric }, checked in full by the app.
--
--  Only drafts for now: a draft with questions can't be published until
--  candidates can answer several questions (U04b-2 adds the version, answer
--  and submission columns). Nullable column; the previous release never
--  reads it. Idempotent.
-- ─────────────────────────────────────────────────────────────

alter table course.assessment_drafts add column if not exists questions jsonb;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'assessment_drafts_questions') then
    alter table course.assessment_drafts add constraint assessment_drafts_questions
      check (questions is null or (jsonb_typeof(questions) = 'array' and jsonb_array_length(questions) between 1 and 20));
  end if;
end
$$;
