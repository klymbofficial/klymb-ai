-- ─────────────────────────────────────────────────────────────
--  Sales internship: applications from /internship
--
--  A 3-month, commission-only sales internship (20% of what each buyer pays).
--  `batch` keeps one intake apart from the next ("2026-12" starts 1 Dec 2026);
--  applying again with the same email updates the answers.
--
--  status: applied → shortlisted (after a look) → accepted / rejected (after a
--  short call). Accepting someone also adds them to course.sales_reps, so they
--  can sign in at /sales. call_note is the team's note from the call.
--
--  Idempotent: safe to run more than once.
-- ─────────────────────────────────────────────────────────────

create table if not exists course.internship_applications (
  id uuid primary key default gen_random_uuid(),
  batch text not null check (length(batch) between 1 and 20),
  email text not null
    constraint internship_applications_email_lowercase check (email = lower(email)),
  name text not null check (length(name) between 2 and 120),
  phone text not null check (length(phone) <= 20),
  city text check (city is null or length(city) <= 80),
  role text not null check (role in ('student', 'working')),
  -- College and year, or company and role.
  org text check (org is null or length(org) <= 160),
  linkedin text check (linkedin is null or length(linkedin) <= 200),
  instagram text check (instagram is null or length(instagram) <= 80),
  hours text not null check (hours in ('under10', '10to20', 'over20')),
  sales_experience text check (sales_experience is null or length(sales_experience) <= 600),
  why text not null check (length(why) between 20 and 1200),
  status text not null default 'applied' check (status in ('applied', 'shortlisted', 'accepted', 'rejected')),
  status_changed_at timestamptz,
  status_by text,
  call_note text check (call_note is null or length(call_note) <= 1000),
  confirmation_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint internship_applications_one_per_email unique (batch, email)
);

create index if not exists internship_applications_batch_idx
  on course.internship_applications (batch, created_at desc);
