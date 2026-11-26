-- ─────────────────────────────────────────────────────────────
--  Company Settings (decided by the user 26 Nov 2026)
--
--  The Settings page follows HackerEarth's: Personal, Company and Billing.
--  This adds what it saves. Only new columns and one new table, all with
--  defaults, so the previous release keeps working. Idempotent.
--
--    * company_members: each member's own job title, contact number,
--      timezone and language, and whether they want the biweekly account
--      update email. Per membership, since a person can be in two companies.
--      (Saved only: no biweekly email is sent yet.)
--    * companies: contact number, website and address, plus two switches,
--      "hide candidate names during review" (Diversity and Inclusion) and
--      "ask candidates an optional EEO survey". Saved only for now: nothing
--      acts on the two switches yet, and the page says so.
--    * company_session_cutoffs: "Log out from other sessions". Sessions are
--      signed tokens, so instead of deleting them we record when the person
--      pressed it and which session pressed it; company pages then refuse any
--      other session that signed in before that moment.
-- ─────────────────────────────────────────────────────────────

alter table course.company_members
  add column if not exists job_title text,
  add column if not exists phone text,
  add column if not exists time_zone text not null default 'Asia/Kolkata',
  add column if not exists language text not null default 'en',
  add column if not exists account_updates boolean not null default true;

alter table course.companies
  add column if not exists contact_phone text,
  add column if not exists website text,
  add column if not exists address text,
  add column if not exists hide_candidate_names boolean not null default false,
  add column if not exists eeo_survey boolean not null default false;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'company_members_job_title_length') then
    alter table course.company_members add constraint company_members_job_title_length check (job_title is null or char_length(job_title) between 1 and 80);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'company_members_phone_shape') then
    alter table course.company_members add constraint company_members_phone_shape check (phone is null or phone ~ '^\+?[0-9 ()-]{6,24}$');
  end if;
  if not exists (select 1 from pg_constraint where conname = 'company_members_time_zone_length') then
    alter table course.company_members add constraint company_members_time_zone_length check (char_length(time_zone) between 1 and 64);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'company_members_language') then
    alter table course.company_members add constraint company_members_language check (language in ('en', 'hi'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'companies_contact_phone_shape') then
    alter table course.companies add constraint companies_contact_phone_shape check (contact_phone is null or contact_phone ~ '^\+?[0-9 ()-]{6,24}$');
  end if;
  if not exists (select 1 from pg_constraint where conname = 'companies_website_shape') then
    alter table course.companies add constraint companies_website_shape check (website is null or (website ~ '^https?://' and char_length(website) <= 200));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'companies_address_length') then
    alter table course.companies add constraint companies_address_length check (address is null or char_length(address) between 1 and 500);
  end if;
end
$$;

create table if not exists course.company_session_cutoffs (
  email text primary key
    constraint company_session_cutoffs_email_lowercase check (email = lower(email)),
  -- Sessions that signed in before this are refused on company pages...
  signed_out_before timestamptz not null,
  -- ...except the one that pressed the button.
  keep_sid text,
  updated_at timestamptz not null default now()
);
