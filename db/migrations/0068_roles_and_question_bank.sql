-- ─────────────────────────────────────────────────────────────
--  Job roles for automatic tests, a maintained question bank, and one
--  creation per click (P0.3 / P0.4 of ASSESSMENT_PRIORITY_PLAN.txt; role
--  skills in a database table, decided by the user 25 Nov)
--
--    assessment_roles               Klymb's job roles for automatic tests:
--                                   the skills (Library tags) each one
--                                   draws questions from. Edited by Klymb
--                                   admins; companies only read active ones.
--    library_questions.seed_key     a stable name for a question kept in the
--                                   repository's question bank, so the seed
--                                   updates it in place instead of adding a
--                                   copy. Klymb's questions only.
--    library_questions.explanation  why the right options are right, for
--                                   reviewers and test writers; never sent
--                                   to candidates.
--    catalog_items.create_key       the key one Create press carries, so a
--                                   retry or a double press makes one test.
--
--  New table and nullable columns; the previous release never reads them.
--  Idempotent.
-- ─────────────────────────────────────────────────────────────

create table if not exists course.assessment_roles (
  slug text primary key check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 60),
  label text not null check (char_length(label) between 1 and 80),
  summary text not null default '' check (char_length(summary) <= 300),
  skills text[] not null check (cardinality(skills) between 1 and 20),
  status text not null default 'active' check (status in ('active', 'hidden')),
  sort integer not null default 100,
  revision integer not null default 1 check (revision >= 1),
  updated_by text not null,
  updated_at timestamptz not null default now()
);

alter table course.library_questions add column if not exists seed_key text;
alter table course.library_questions add column if not exists explanation text;
alter table course.catalog_items add column if not exists create_key text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'library_questions_seed_key') then
    alter table course.library_questions add constraint library_questions_seed_key
      check (seed_key is null or (owner_company_id is null and seed_key ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(seed_key) <= 80));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'library_questions_explanation') then
    alter table course.library_questions add constraint library_questions_explanation
      check (explanation is null or char_length(explanation) <= 1000);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'catalog_items_create_key') then
    alter table course.catalog_items add constraint catalog_items_create_key
      check (create_key is null or (owner_company_id is not null and create_key ~ '^[0-9a-f-]{36}$'));
  end if;
end
$$;

create unique index if not exists library_questions_seed_key_once on course.library_questions (seed_key) where seed_key is not null;
create unique index if not exists catalog_items_create_once on course.catalog_items (owner_company_id, create_key) where create_key is not null;
