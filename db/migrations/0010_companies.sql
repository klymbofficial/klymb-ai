-- ─────────────────────────────────────────────────────────────
--  Companies, teams and members (B2B)
--
--  A company buys seats for its people. Each person belongs to exactly one
--  company, with one of three roles:
--
--    * hr       sees the whole company. Need not be on a team.
--    * head     sees their own team. Must be on a team.
--    * employee sees only their own data. May be on a team.
--
--  Keyed by the Google-verified email, like admin_users and learners, so the
--  access check in src/lib/company/auth.ts is one lookup by the signed-in
--  address. The role is read from here on every request, never stored in
--  the login token, so removing a row takes effect immediately.
--
--  Idempotent: safe to run more than once.
-- ─────────────────────────────────────────────────────────────

create table if not exists course.companies (
  id uuid primary key default gen_random_uuid(),
  -- The URL name: klymb.ai/org/<slug>.
  slug text not null unique
    constraint companies_slug_shape check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 60),
  name text not null,
  -- The company color for the course app, as #rrggbb. Null means Klymb's own.
  brand_color text
    constraint companies_brand_color_shape check (brand_color ~ '^#[0-9a-f]{6}$'),
  created_at timestamptz not null default now()
);

create table if not exists course.teams (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references course.companies (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (company_id, name),
  -- Lets company_members point at (company, team) together, so a member's
  -- team is always one of their own company's teams.
  unique (company_id, id)
);

-- One row per person: the email is the primary key, so nobody can be a
-- member of two companies.
create table if not exists course.company_members (
  email text primary key
    constraint company_members_email_lowercase check (email = lower(email)),
  company_id uuid not null references course.companies (id) on delete cascade,
  team_id uuid,
  role text not null
    constraint company_members_role_check check (role in ('hr', 'head', 'employee')),
  name text,
  added_at timestamptz not null default now(),
  constraint company_members_team_in_company
    foreign key (company_id, team_id) references course.teams (company_id, id) on delete set null (team_id),
  constraint company_members_head_has_team
    check (role <> 'head' or team_id is not null)
);

create index if not exists teams_company_idx on course.teams (company_id);
create index if not exists company_members_company_idx on course.company_members (company_id, team_id);
