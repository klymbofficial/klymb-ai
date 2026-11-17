-- ─────────────────────────────────────────────────────────────
--  Sales reps: interns who work leads without being admins
--
--  A rep signs in with Google at /sales and sees only the leads whose
--  owner_email is theirs. Owners add and remove reps from Sales › Team in
--  admin; removing one sets active = false (the row stays, so their history
--  still has a name) and hands their open leads back.
--
--  course.sales_lead_views records each lead a rep opens, so an owner can see
--  who looked at which numbers.
--
--  Idempotent: safe to run more than once.
-- ─────────────────────────────────────────────────────────────

create table if not exists course.sales_reps (
  email text primary key
    constraint sales_reps_email_lowercase check (email = lower(email)),
  name text check (name is null or length(name) <= 80),
  active boolean not null default true,
  added_by text not null,
  created_at timestamptz not null default now(),
  removed_at timestamptz
);

create table if not exists course.sales_lead_views (
  id bigint generated always as identity primary key,
  lead_id uuid not null references course.sales_leads (id) on delete cascade,
  by_email text not null,
  viewed_at timestamptz not null default now()
);

create index if not exists sales_lead_views_by_idx on course.sales_lead_views (by_email, viewed_at desc);
