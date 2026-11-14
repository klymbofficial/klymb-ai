-- ─────────────────────────────────────────────────────────────
--  Learner profiles
--
--  One profile per person, keyed by the Google-verified email: who they are,
--  their education and experience, skills and links. The dashboard scores how
--  complete it is. It sits apart from course.learners, whose GitHub and
--  LinkedIn are the identities a track's submissions are checked against and
--  lock once work is in; the profile's own links are only for showing.
--
--  Adds one table the previous release never reads, so it is safe while that
--  release is live.
--
--  Idempotent: safe to run more than once.
-- ─────────────────────────────────────────────────────────────

create table if not exists course.profiles (
  email text primary key
    constraint profiles_email_lowercase check (email = lower(email)),
  name text check (char_length(name) <= 120),
  headline text check (char_length(headline) <= 120),
  phone text check (char_length(phone) <= 20),
  city text check (char_length(city) <= 80),
  status text check (status in ('student', 'working')),
  institution text check (char_length(institution) <= 160),
  degree text check (char_length(degree) <= 120),
  graduation_year smallint check (graduation_year between 1970 and 2040),
  -- True when they have said they have no work experience yet: that completes the section.
  no_experience boolean not null default false,
  job_role text check (char_length(job_role) <= 120),
  company text check (char_length(company) <= 120),
  skills text[] not null default '{}' check (cardinality(skills) <= 20),
  github_username text check (char_length(github_username) <= 39),
  linkedin_slug text check (char_length(linkedin_slug) <= 100),
  portfolio_url text check (char_length(portfolio_url) <= 500),
  updated_at timestamptz not null default now()
);
