-- ─────────────────────────────────────────────────────────────
--  Privileges for the application role
--
--  Two roles, deliberately:
--
--    * the database owner runs these migrations (DATABASE_MIGRATE_URL), and
--    * `klymb_course` is what the running app connects as (DATABASE_URL).
--
--  klymb_course gets DML on the `course` schema and nothing else. It cannot
--  create or drop anything, and the only thing it can read in `public` — the
--  schema holding app.klymb.ai's 148 tables and its users — is two columns of
--  "User", enough to resolve an email to a user_id. That is a tighter boundary
--  than klymb.ai had on Supabase, where the service-role key bypassed RLS on
--  every table in the database.
--
--  Create the role once, by hand, with a password you generate — it is a
--  secret and does not belong in this file. As the database owner:
--
--    create role klymb_course with login password '<generated>';
--
--  Then re-run the migrations. This file is a no-op until the role exists, so
--  the order does not matter.
--
--  Note on the foreign key from course.learners to public."User": PostgreSQL
--  runs referential-integrity checks internally as the referenced table's
--  owner, so klymb_course needs no privilege on "User" for an insert to pass
--  the check. The column grant below is for the app's own lookup query.
--
--  Idempotent: safe to run more than once.
-- ─────────────────────────────────────────────────────────────

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'klymb_course') then
    raise notice 'Role klymb_course does not exist yet — skipping grants. Create it and re-run.';
    return;
  end if;

  -- The course schema: read and write everything, create nothing.
  execute 'grant usage on schema course to klymb_course';
  execute 'grant select, insert, update, delete on all tables in schema course to klymb_course';
  execute 'grant usage, select on all sequences in schema course to klymb_course';
  execute 'grant execute on all functions in schema course to klymb_course';

  -- Tables added by later migrations are usable without re-granting by hand.
  execute 'alter default privileges in schema course grant select, insert, update, delete on tables to klymb_course';
  execute 'alter default privileges in schema course grant usage, select on sequences to klymb_course';
  execute 'alter default privileges in schema course grant execute on functions to klymb_course';

  -- The platform's schema: resolve an email to a user id, and nothing more.
  -- A column grant, so `select * from "User"` is refused. One nuance worth
  -- knowing: a column grant still permits `count(*)`, so this role can see
  -- how many platform users there are, though no other column of them.
  execute 'grant usage on schema public to klymb_course';
  execute 'grant select (id, email) on public."User" to klymb_course';
end $$;
