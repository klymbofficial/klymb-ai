-- ─────────────────────────────────────────────────────────────
--  The question library (L1 of the B2B plan, LIBRARY_PROPOSAL.txt,
--  approved 24 Nov: a library of single questions as on HackerEarth;
--  Klymb Library for every company, My Library per company; multiple
--  choice, written, written + files only)
--
--    course.library_questions  one question. owner_company_id null:
--                              Klymb's, seen by every company once
--                              published. Set: that company's own, seen
--                              by nobody else.
--      type        mcq | written | written_file
--      options     mcq only: [{ text, correct }], 2 to 8, at least one
--                  correct (checked in full by the app). Several correct
--                  options make it a "pick all that apply" question.
--      partial     mcq with several correct options only: partial marks.
--      rubric      written questions only: [{ title, skill, points, guide }]
--      points      what the question is worth.
--      revision    bumped on every save; a save names the revision it
--                  started from, so two editors never overwrite each other.
--
--  Nothing reads it yet except the Library pages; tests copy a question in
--  a later step (L2). New table only; the previous release never reads it.
--  Idempotent.
-- ─────────────────────────────────────────────────────────────

create table if not exists course.library_questions (
  id uuid primary key default gen_random_uuid(),
  owner_company_id uuid references course.companies (id),
  type text not null check (type in ('mcq', 'written', 'written_file')),
  title text not null check (char_length(title) between 1 and 160),
  statement text not null check (char_length(statement) between 1 and 6000),
  difficulty text not null check (difficulty in ('easy', 'medium', 'hard')),
  tags text[] not null default '{}' check (cardinality(tags) <= 10),
  points integer not null check (points between 1 and 100),
  minutes integer not null check (minutes between 1 and 120),
  options jsonb,
  partial boolean not null default false,
  rubric jsonb,
  status text not null default 'draft' check (status in ('draft', 'published', 'retired')),
  revision integer not null default 1 check (revision >= 1),
  created_by text not null,
  updated_by text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint library_questions_mcq_options check (
    (type = 'mcq') = (options is not null)
    and (options is null or (jsonb_typeof(options) = 'array' and jsonb_array_length(options) between 2 and 8))
  ),
  constraint library_questions_partial check (not partial or type = 'mcq'),
  constraint library_questions_rubric check (
    (type = 'mcq') = (rubric is null)
    and (rubric is null or (jsonb_typeof(rubric) = 'array' and jsonb_array_length(rubric) between 1 and 10))
  )
);

create index if not exists library_questions_klymb on course.library_questions (status, updated_at desc) where owner_company_id is null;
create index if not exists library_questions_owner on course.library_questions (owner_company_id, updated_at desc) where owner_company_id is not null;
