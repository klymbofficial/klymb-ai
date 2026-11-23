-- ─────────────────────────────────────────────────────────────
--  Business catalog: what companies can find, and what each may see
--
--  A course or assessment Klymb wrote is described in code
--  (src/data/business-catalog.ts): its title, outcomes, preview, rubric
--  summary and so on. This adds what has to change without a release:
--
--    catalog_items          one row per item a Klymb admin has touched:
--                           draft / published / retired, skill tags and
--                           purpose (workforce, hiring). A program is an
--                           item too, and keeps its own title, summary and
--                           steps (other items' slugs, in order) here, since
--                           it exists only in the database. The steps are an
--                           array so a reorder is one atomic update; the app
--                           checks each one names a course or assessment.
--    company_catalog_grants which items each company may see. Granting a
--                           program lets the company see its steps.
--
--  A company sees an item only when it is published and granted (directly
--  or through a published, granted program). Nothing is published here:
--  every row starts as a draft, set by a Klymb admin at /admin/catalog.
--  One published course serves every company granted it; no lessons are
--  copied.
--
--  Adds two tables the previous release never reads, so it is safe while
--  that release is live.
--
--  Idempotent: safe to run more than once.
-- ─────────────────────────────────────────────────────────────

create table if not exists course.catalog_items (
  slug text primary key
    constraint catalog_items_slug check (slug ~ '^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$'),
  kind text not null
    constraint catalog_items_kind check (kind in ('course', 'assessment', 'program')),
  status text not null default 'draft'
    constraint catalog_items_status check (status in ('draft', 'published', 'retired')),
  skills text[] not null default '{}'
    constraint catalog_items_skills check (cardinality(skills) <= 12),
  purposes text[] not null default '{}'
    constraint catalog_items_purposes check (purposes <@ array['workforce', 'hiring']::text[]),
  -- Only a program keeps its own words here; a course or assessment takes them from code.
  title text
    constraint catalog_items_title check (title is null or char_length(title) between 1 and 120),
  summary text
    constraint catalog_items_summary check (summary is null or char_length(summary) between 1 and 600),
  steps text[] not null default '{}'
    constraint catalog_items_steps check (cardinality(steps) <= 50),
  constraint catalog_items_program_words check ((kind = 'program') = (title is not null)),
  constraint catalog_items_program_steps check (kind = 'program' or cardinality(steps) = 0),
  updated_at timestamptz not null default now(),
  updated_by text not null
);

create table if not exists course.company_catalog_grants (
  company_id uuid not null references course.companies (id) on delete cascade,
  item_slug text not null references course.catalog_items (slug) on delete cascade,
  granted_by text not null,
  granted_at timestamptz not null default now(),
  primary key (company_id, item_slug)
);

create index if not exists company_catalog_grants_item_idx on course.company_catalog_grants (item_slug);
