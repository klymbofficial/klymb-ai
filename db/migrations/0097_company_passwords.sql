-- ─────────────────────────────────────────────────────────────
--  Company passwords (decided by the user 25 Nov 2026)
--
--  Company members may sign in with a password as well as an emailed code.
--  Nobody starts with one: a member signs in once with a code, then sets a
--  password in Settings. The code stays on the sign-in page as the way back
--  in for anyone who forgot it. See src/lib/company/password-rules.ts.
--
--    * One password per person, keyed by email, across every company they
--      belong to (company_members is keyed by company and email since 0047,
--      so there is no foreign key; sign-in checks for an active membership).
--    * Only a salted scrypt hash is stored, never the password.
--
--  New table; the previous release reads nothing from it. Idempotent.
-- ─────────────────────────────────────────────────────────────

create table if not exists course.company_passwords (
  email text primary key
    constraint company_passwords_email_lowercase check (email = lower(email)),
  password_hash text not null
    constraint company_passwords_hash_shape check (password_hash ~ '^scrypt\$[0-9]+\$[0-9]+\$[0-9]+\$[A-Za-z0-9+/=]+\$[A-Za-z0-9+/=]+$'),
  updated_at timestamptz not null default now()
);
