-- ─────────────────────────────────────────────────────────────
--  Company-written tests (U04a of the B2B plan, U04_PROPOSAL.txt,
--  approved 24 Nov: company-owned catalog items; writers publish, and
--  publishing counts as the company's approval)
--
--    catalog_items.owner_company_id  null for Klymb's items. Set, the item
--                                    is that company's own test: kind
--                                    'assessment' only, with its own title,
--                                    never granted to or seen by anyone else.
--
--  Drafts, versions, approvals, rounds, attempts and reviews are unchanged:
--  a company test is a catalog item like any other. Adds a nullable column
--  and widens one check; the previous release never reads the column and
--  never writes a title on an assessment. Idempotent.
-- ─────────────────────────────────────────────────────────────

alter table course.catalog_items
  add column if not exists owner_company_id uuid references course.companies (id);

create index if not exists catalog_items_owner on course.catalog_items (owner_company_id) where owner_company_id is not null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'catalog_items_owned_assessment') then
    alter table course.catalog_items add constraint catalog_items_owned_assessment
      check (owner_company_id is null or kind = 'assessment');
  end if;
  -- A title is a program's, or a company test's; Klymb's courses and assessments take theirs from code.
  if exists (select 1 from pg_constraint where conname = 'catalog_items_program_words') then
    alter table course.catalog_items drop constraint catalog_items_program_words;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'catalog_items_own_words') then
    alter table course.catalog_items add constraint catalog_items_own_words
      check ((kind = 'program' or owner_company_id is not null) = (title is not null));
  end if;
end
$$;

-- Another company's test is never granted to a company.
create or replace function course.catalog_grant_not_owned() returns trigger
language plpgsql as $$
begin
  if exists (select 1 from course.catalog_items i where i.slug = new.item_slug and i.owner_company_id is not null) then
    raise exception 'a company''s own test is not granted' using errcode = '23514';
  end if;
  return new;
end
$$;

drop trigger if exists catalog_grant_not_owned on course.company_catalog_grants;
create trigger catalog_grant_not_owned before insert or update on course.company_catalog_grants
  for each row execute function course.catalog_grant_not_owned();
