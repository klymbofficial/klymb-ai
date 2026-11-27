-- ─────────────────────────────────────────────────────────────
--  AI suggestions for written answers (decided by the user 26 Nov 2026:
--  a company switch, off by default, with every suggestion kept on record)
--
--    companies.ai_review_suggestions  the switch, in Settings › AI features.
--                                     While off, reviewers see no AI button
--                                     and nothing is sent to the AI service.
--    ai_review_suggestions            one row per time a reviewer asked: who,
--                                     which attempt, which model, and what it
--                                     proposed for each written rubric area
--                                     ([{index, points, max, evidence,
--                                     missing, reasoning}], index into the
--                                     review's rubric). The reviewer's own
--                                     scores stay in attempt_reviews, so the
--                                     two can be compared. A suggestion never
--                                     scores anything by itself.
--
--  A new column with a default and a new table: the previous release never
--  reads either. Idempotent.
-- ─────────────────────────────────────────────────────────────

alter table course.companies add column if not exists ai_review_suggestions boolean not null default false;

create table if not exists course.ai_review_suggestions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references course.companies (id) on delete cascade,
  attempt_id uuid not null references course.candidate_attempts (id) on delete cascade,
  requested_by text not null constraint ai_review_suggestions_by check (requested_by = lower(requested_by) and char_length(requested_by) between 3 and 320),
  model text not null constraint ai_review_suggestions_model check (char_length(model) between 1 and 80),
  suggestions jsonb not null constraint ai_review_suggestions_shape check (jsonb_typeof(suggestions) = 'array' and jsonb_array_length(suggestions) between 1 and 200),
  created_at timestamptz not null default now()
);

create index if not exists ai_review_suggestions_attempt_idx on course.ai_review_suggestions (attempt_id, created_at desc);
create index if not exists ai_review_suggestions_company_idx on course.ai_review_suggestions (company_id);

-- A record: never edited, only removed with its attempt or company.
create or replace function course.ai_review_suggestions_fixed() returns trigger
language plpgsql as $$
begin
  raise exception 'AI review suggestions are a record and cannot be changed';
end;
$$;

drop trigger if exists ai_review_suggestions_no_update on course.ai_review_suggestions;
create trigger ai_review_suggestions_no_update before update on course.ai_review_suggestions
  for each row execute function course.ai_review_suggestions_fixed();
