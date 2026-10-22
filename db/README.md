# The database

klymb.ai and [app.klymb.ai](https://app.klymb.ai) share one Neon Postgres
database, so there is one user base rather than two. app.klymb.ai owns the
`public` schema through Prisma (148 models, 13k+ users); this app owns the
`course` schema, and the two meet at one foreign key:

```
course.learners.user_id  →  public."User".id
```

`course.learners.email` stays the operative key — it is the Google-verified
identity everything authorises against, and every query filters on it.
`user_id` is the link that makes a real join possible. It is null for a course
registrant with no app.klymb.ai account yet, which is fine; a registration here
never creates a platform account.

## Why a separate schema

- **Prisma stays out of our way.** app.klymb.ai's `schema.prisma` has no
  `multiSchema` and no `schemas` list, so Prisma manages `public` alone and
  never sees `course`. Our tables in `public` would read as drift, and
  `prisma migrate dev` would offer to reset them.
- **Blast radius.** The app connects as a role with privileges on `course` and
  nothing else. It is structurally unable to read or write the platform's
  tables, beyond `(id, email)` of `"User"` for the lookup above. That is
  tighter than the Supabase setup it replaced, where the service-role key
  bypassed row-level security on every table in the database.

Nothing collides by name either: Prisma's tables are `"User"`, `"Account"`…
while ours are `learners`, `registrations`…

## Setting it up

Do this against a **Neon branch of production** first, and repoint to
production only once the verification below passes.

1. **Confirm the target.** `ABtalksapp/.env.local` lists more than one Neon
   endpoint. Take the production one from the `abtalksapp` project's Vercel
   environment, not the local file, and confirm the 13k+ users are in it:

   ```sql
   select count(*) from "User";
   ```

2. **Create the application role**, as the database owner, with a password you
   generate. It is a secret, so it does not live in this repo:

   ```sql
   create role klymb_course with login password '<generated>';
   ```

3. **Apply the schema.** `DATABASE_MIGRATE_URL` is the owner connection (it
   needs to create tables); `DATABASE_URL` is the `klymb_course` one the app
   runs as. Both belong in `.env.local`, and the app's in Vercel.

   ```bash
   npm run db:migrate
   ```

   Migrations are applied in filename order, once each, recorded in
   `course.schema_migrations`. Each file runs in one transaction with its
   ledger row, so a failure leaves nothing behind. `0002_grants.sql` is a no-op
   until the role exists, so the order of steps 2 and 3 does not matter.

4. **Point `DATABASE_URL` at the `-pooler` host.** This database serves
   app.klymb.ai's users as well, and the connection budget is not ours alone to
   spend. The pool in `src/lib/db/client.ts` is deliberately small.

## Verifying

```sql
-- Ours are all in course, none in public.
select table_schema, count(*) from information_schema.tables
 where table_name in ('learners','registrations','payments','day_submissions',
                      'assessment_results','support_tickets','admin_audit_log',
                      'push_subscriptions','rate_limit_events','admin_users')
 group by table_schema;

-- As klymb_course: the first is refused, the second works.
select * from "User" limit 1;
select id, email from "User" limit 1;
```

In the app.klymb.ai checkout, `npx prisma migrate status` must report no drift:
that is what proves `course` is invisible to Prisma.

## Adding a migration

A new numbered file in `db/migrations/`. Never edit an applied one — the runner
warns when a file's checksum has changed, because the next environment will hit
it as a schema difference. Tables created later are usable by the app without
re-granting, via the default privileges set in `0002_grants.sql`.

## History

`supabase/migrations/` is the retired Supabase schema. It is kept as history,
is applied nowhere, and `tests/migration.test.ts` pins what it said. Its
row-level security policies were already inert before the move: every one keyed
off `auth.jwt()` or `auth.uid()`, and this app authenticates with NextAuth and
Google without ever signing anyone into Supabase Auth.
