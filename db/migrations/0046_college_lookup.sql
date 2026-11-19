-- ─────────────────────────────────────────────────────────────
--  College lookup: read app.klymb.ai's college catalogue
--
--  app.klymb.ai keeps ~54,000 Indian colleges (AISHE/AICTE) in
--  public."College", owned by its Prisma schema. The hackathon form's college
--  field searches it as you type, so both apps share one list.
--
--  A column grant, like the one on public."User" in 0002: klymb_course can
--  read the columns the search needs and nothing else, and can never write.
--
--  A no-op where the table or the role doesn't exist (a local database built
--  only from these migrations), so the app falls back to free typing there.
--
--  Idempotent: safe to run more than once.
-- ─────────────────────────────────────────────────────────────

do $$
begin
  if to_regclass('public."College"') is not null
     and exists (select 1 from pg_roles where rolname = 'klymb_course') then
    execute 'grant usage on schema public to klymb_course';
    execute 'grant select (id, name, state, district, city, tier, "searchText", "isActive") on public."College" to klymb_course';
  end if;
end $$;
