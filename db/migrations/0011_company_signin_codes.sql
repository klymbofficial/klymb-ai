-- ─────────────────────────────────────────────────────────────
--  Company sign-in codes
--
--  Invited company members (course.company_members) sign in with a 6-digit
--  code sent to their email. See src/lib/company/signin-code.ts.
--
--    * Only the code's HMAC-SHA256 (keyed with AUTH_SECRET) is stored, never
--      the code itself.
--    * One row per member: asking for a new code replaces the old one, so
--      the table never grows past the number of members and needs no
--      cleanup job.
--    * attempts counts every try; at the limit the code stops working.
--    * The row disappears with the member, so a removed member's code dies.
--
--  Also reserves the slug "sign-in", which the sign-in page uses.
--
--  Idempotent: safe to run more than once.
-- ─────────────────────────────────────────────────────────────

create table if not exists course.company_signin_codes (
  email text primary key
    references course.company_members (email) on delete cascade on update cascade,
  code_hash text not null
    constraint company_signin_codes_hash_shape check (code_hash ~ '^[0-9a-f]{64}$'),
  expires_at timestamptz not null,
  attempts smallint not null default 0
    constraint company_signin_codes_attempts_check check (attempts >= 0),
  created_at timestamptz not null default now()
);

-- /org/sign-in is the company sign-in page, so no company may take
-- "sign-in" as its slug: klymb.ai/org/sign-in would never reach it.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'companies_slug_reserved') then
    alter table course.companies
      add constraint companies_slug_reserved check (slug <> 'sign-in');
  end if;
end $$;
