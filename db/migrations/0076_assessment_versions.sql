-- ─────────────────────────────────────────────────────────────
--  Practical assessments: a Klymb draft, frozen versions, and each
--  company's approval
--
--    assessment_drafts          the one working copy a Klymb admin edits at
--                               /admin/catalog/assessments/[slug]. `revision`
--                               goes up on every save, so two admins can't
--                               overwrite each other, and a publish names the
--                               revision it read.
--    assessment_versions        what publishing makes: a numbered copy of the
--                               draft (1, 2, 3 …) that is never changed or
--                               removed, and at most one per draft revision. A trigger refuses any update, delete
--                               or truncate, so a run that points at a version
--                               (T07) keeps its task, rubric and scoring rules
--                               for good. Editing and publishing again makes
--                               the next number.
--    company_assessment_reviews a company reviewer's decision on one version
--                               for their company: approved, or declined with
--                               a note for Klymb. Recruiters can pick only an
--                               approved version. A new version needs its own
--                               approval; until then the last approved one
--                               stays in use.
--
--  A rubric is a JSON array of {title, skill, points, guide}. `guide` is the
--  scoring rule for reviewers and never reaches a candidate. The app checks
--  each criterion; the database checks the array's size.
--
--  Adds three tables the previous release never reads, so it is safe while
--  that release is live. Nothing is published here.
--
--  Idempotent: safe to run more than once.
-- ─────────────────────────────────────────────────────────────

create table if not exists course.assessment_drafts (
  slug text primary key references course.catalog_items (slug) on delete cascade,
  revision integer not null default 1 constraint assessment_drafts_revision check (revision >= 1),
  role text not null default '' constraint assessment_drafts_role check (char_length(role) <= 120),
  minutes integer constraint assessment_drafts_minutes check (minutes is null or minutes between 5 and 480),
  submission text not null default 'written'
    constraint assessment_drafts_submission check (submission in ('written', 'written_file')),
  tools_allowed text[] not null default '{}' constraint assessment_drafts_tools_allowed check (cardinality(tools_allowed) <= 12),
  tools_not_allowed text[] not null default '{}' constraint assessment_drafts_tools_not_allowed check (cardinality(tools_not_allowed) <= 12),
  instructions text not null default '' constraint assessment_drafts_instructions check (char_length(instructions) <= 3000),
  task_title text not null default '' constraint assessment_drafts_task_title check (char_length(task_title) <= 160),
  task_brief text not null default '' constraint assessment_drafts_task_brief check (char_length(task_brief) <= 6000),
  sample_title text not null default '' constraint assessment_drafts_sample_title check (char_length(sample_title) <= 160),
  sample_brief text not null default '' constraint assessment_drafts_sample_brief check (char_length(sample_brief) <= 3000),
  rubric jsonb not null default '[]'
    constraint assessment_drafts_rubric check (jsonb_typeof(rubric) = 'array' and jsonb_array_length(rubric) <= 10),
  results text not null default 'none'
    constraint assessment_drafts_results check (results in ('none', 'overall', 'by_area')),
  updated_by text not null,
  updated_at timestamptz not null default now()
);

create table if not exists course.assessment_versions (
  id uuid primary key default gen_random_uuid(),
  slug text not null references course.catalog_items (slug),
  version integer not null constraint assessment_versions_version check (version >= 1),
  -- The draft revision it was copied from. One revision makes at most one
  -- version, so a double-clicked or retried publish can't make a copy.
  draft_revision integer not null constraint assessment_versions_draft_revision check (draft_revision >= 1),
  -- The item's title when it was published, so a run shows what the candidate saw.
  title text not null constraint assessment_versions_title check (char_length(title) between 1 and 160),
  role text not null constraint assessment_versions_role check (char_length(role) between 1 and 120),
  minutes integer not null constraint assessment_versions_minutes check (minutes between 5 and 480),
  submission text not null constraint assessment_versions_submission check (submission in ('written', 'written_file')),
  tools_allowed text[] not null,
  tools_not_allowed text[] not null,
  instructions text not null constraint assessment_versions_instructions check (char_length(instructions) between 1 and 3000),
  task_title text not null constraint assessment_versions_task_title check (char_length(task_title) between 1 and 160),
  task_brief text not null constraint assessment_versions_task_brief check (char_length(task_brief) between 1 and 6000),
  sample_title text not null constraint assessment_versions_sample_title check (char_length(sample_title) between 1 and 160),
  sample_brief text not null constraint assessment_versions_sample_brief check (char_length(sample_brief) between 1 and 3000),
  rubric jsonb not null
    constraint assessment_versions_rubric check (jsonb_typeof(rubric) = 'array' and jsonb_array_length(rubric) between 1 and 10),
  results text not null constraint assessment_versions_results check (results in ('none', 'overall', 'by_area')),
  published_by text not null,
  published_at timestamptz not null default now(),
  constraint assessment_versions_number unique (slug, version),
  constraint assessment_versions_from_draft unique (slug, draft_revision)
);

-- Published versions are never changed: a change is a new version.
create or replace function course.assessment_versions_frozen() returns trigger
language plpgsql as $$
begin
  raise exception 'assessment versions cannot be changed or removed; publish a new version instead'
    using errcode = 'P0001';
end
$$;

drop trigger if exists assessment_versions_frozen on course.assessment_versions;
create trigger assessment_versions_frozen
  before update or delete on course.assessment_versions
  for each row execute function course.assessment_versions_frozen();

drop trigger if exists assessment_versions_frozen_truncate on course.assessment_versions;
create trigger assessment_versions_frozen_truncate
  before truncate on course.assessment_versions
  for each statement execute function course.assessment_versions_frozen();

create table if not exists course.company_assessment_reviews (
  company_id uuid not null references course.companies (id) on delete cascade,
  version_id uuid not null references course.assessment_versions (id),
  decision text not null constraint company_assessment_reviews_decision check (decision in ('approved', 'declined')),
  note text constraint company_assessment_reviews_note check (note is null or char_length(note) between 1 and 1000),
  -- A decline always says what to change.
  constraint company_assessment_reviews_declined_note check (decision = 'approved' or note is not null),
  decided_by text not null,
  decided_at timestamptz not null default now(),
  primary key (company_id, version_id)
);

create index if not exists company_assessment_reviews_version_idx on course.company_assessment_reviews (version_id);
