-- ─────────────────────────────────────────────────────────────
--  Company branding: a draft and a published version
--
--  A company's admin sets how their workspace looks: display name, logo,
--  accent colour, welcome text and support contact. They save a draft,
--  preview it, and publish it; only the published version is shown to
--  anyone else (the branded sign-in page, the workspace, invite emails, the
--  bar on an assigned course).
--
--    draft      what the admin is working on; {} until they save
--    published  what everyone sees; null until the first publish
--
--  Both are JSON objects whose shape src/lib/company/branding.ts checks on
--  every write and every read; nothing here trusts them beyond being objects.
--  A logo is an object key in storage (R2, under company-brand/), never a URL.
--
--  companies.logo_url and brand_color (0012) stay as they are and are read
--  only when a company has published nothing yet.
--
--  Adds one table the previous release never reads, so it is safe while that
--  release is live.
--
--  Idempotent: safe to run more than once.
-- ─────────────────────────────────────────────────────────────

create table if not exists course.company_branding (
  company_id uuid primary key references course.companies (id) on delete cascade,
  draft jsonb not null default '{}'::jsonb
    constraint company_branding_draft_object check (jsonb_typeof(draft) = 'object'),
  draft_updated_at timestamptz,
  draft_updated_by text,
  published jsonb
    constraint company_branding_published_object check (published is null or jsonb_typeof(published) = 'object'),
  published_at timestamptz,
  published_by text,
  constraint company_branding_published_pair check ((published is null) = (published_at is null))
);
