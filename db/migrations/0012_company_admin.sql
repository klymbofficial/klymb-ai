-- ─────────────────────────────────────────────────────────────
--  Company settings set from Klymb admin (/admin/companies)
--
--    * logo_url    an https link to the company's logo, pasted by an admin.
--                  Null shows no logo. (Uploads come with file storage.)
--    * seat_count  how many people the company has paid for. The admin
--                  page never sets it below the current number of members.
--
--  brand_color already exists (0010).
--
--  Idempotent: safe to run more than once.
-- ─────────────────────────────────────────────────────────────

alter table course.companies add column if not exists logo_url text;
alter table course.companies add column if not exists seat_count integer not null default 0;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'companies_logo_url_shape') then
    alter table course.companies
      add constraint companies_logo_url_shape check (logo_url ~ '^https://' and char_length(logo_url) <= 2000);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'companies_seat_count_range') then
    alter table course.companies
      add constraint companies_seat_count_range check (seat_count between 0 and 100000);
  end if;
end $$;
