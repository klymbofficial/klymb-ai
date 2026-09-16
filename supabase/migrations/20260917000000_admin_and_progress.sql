-- ─────────────────────────────────────────────────────────────
-- Admin access + learner progress schema
-- ─────────────────────────────────────────────────────────────

-- Who may use the admin. Add rows here to grant access; delete to revoke.
create table if not exists public.admin_users (
  email text primary key,
  name text,
  added_at timestamptz not null default now()
);
alter table public.admin_users enable row level security;

-- True when the signed-in user's email is in admin_users.
-- SECURITY DEFINER so the check itself is not subject to RLS.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_users a
    where lower(a.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

drop policy if exists "Admins read the admin list" on public.admin_users;
create policy "Admins read the admin list" on public.admin_users
  for select to authenticated using (public.is_admin());
grant select on public.admin_users to authenticated;

-- Admins may read registrations. The public still may only insert.
drop policy if exists "Admins read registrations" on public.registrations;
create policy "Admins read registrations" on public.registrations
  for select to authenticated using (public.is_admin());
grant select on public.registrations to authenticated;

-- ── Learners ────────────────────────────────────────────────
create table if not exists public.learners (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users (id) on delete set null,
  email text not null unique,
  name text not null,
  track text not null check (track in ('qa-engineer','l1-l2-support','project-manager','junior-developer','reporting-analyst')),
  cohort_start date not null,
  github_url text,
  linkedin_url text,
  status text not null default 'active' check (status in ('active','paused','withdrawn','completed')),
  created_at timestamptz not null default now()
);
alter table public.learners enable row level security;

drop policy if exists "Admins manage learners" on public.learners;
create policy "Admins manage learners" on public.learners
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Learners read themselves" on public.learners;
create policy "Learners read themselves" on public.learners
  for select to authenticated using (user_id = auth.uid());

grant select, insert, update, delete on public.learners to authenticated;

-- ── Daily submissions ───────────────────────────────────────
create table if not exists public.day_submissions (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid not null references public.learners (id) on delete cascade,
  day smallint not null check (day between 1 and 30),
  deliverable_url text,
  note text,
  status text not null default 'submitted' check (status in ('submitted','reviewed','needs_rework')),
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewer_note text,
  unique (learner_id, day)
);
alter table public.day_submissions enable row level security;

drop policy if exists "Admins manage submissions" on public.day_submissions;
create policy "Admins manage submissions" on public.day_submissions
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Learners manage their submissions" on public.day_submissions;
create policy "Learners manage their submissions" on public.day_submissions
  for all to authenticated
  using (learner_id in (select id from public.learners where user_id = auth.uid()))
  with check (learner_id in (select id from public.learners where user_id = auth.uid()));

grant select, insert, update, delete on public.day_submissions to authenticated;

-- ── Weekly assessments ──────────────────────────────────────
create table if not exists public.assessment_results (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid not null references public.learners (id) on delete cascade,
  after_day smallint not null check (after_day in (7, 14, 21, 28)),
  -- { judgment, evidence, communication, ai_direction, delivery_discipline } each 1–4
  scores jsonb,
  weighted_score numeric(3,2),
  band text check (band in ('not_yet','developing','job_ready','distinction')),
  feedback text,
  reviewed_at timestamptz,
  reviewer_email text,
  created_at timestamptz not null default now(),
  unique (learner_id, after_day)
);
alter table public.assessment_results enable row level security;

drop policy if exists "Admins manage assessments" on public.assessment_results;
create policy "Admins manage assessments" on public.assessment_results
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Learners read their assessments" on public.assessment_results;
create policy "Learners read their assessments" on public.assessment_results
  for select to authenticated
  using (learner_id in (select id from public.learners where user_id = auth.uid()));

grant select, insert, update, delete on public.assessment_results to authenticated;

create index if not exists day_submissions_learner_idx on public.day_submissions (learner_id, day);
create index if not exists learners_cohort_idx on public.learners (cohort_start, track);
