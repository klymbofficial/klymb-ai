-- Registrations from the public "Register my interest" form.
create table if not exists public.registrations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null check (char_length(name) between 2 and 120),
  email text not null check (char_length(email) <= 254),
  phone text not null check (char_length(phone) <= 20),
  track text not null check (track in ('qa-engineer','l1-l2-support','project-manager','junior-developer','reporting-analyst')),
  job_role text not null,
  experience text not null,
  linkedin text,
  consent boolean not null check (consent),
  cohort_start date not null
);

create index if not exists registrations_created_at_idx on public.registrations (created_at desc);

-- Row Level Security: the public (anon) key may INSERT only. Nobody can read,
-- update or delete through the API; view rows in the Supabase dashboard.
alter table public.registrations enable row level security;

drop policy if exists "Public can register" on public.registrations;
create policy "Public can register"
  on public.registrations for insert
  to anon, authenticated
  with check (consent);

revoke all on public.registrations from anon, authenticated;
grant insert on public.registrations to anon, authenticated;
