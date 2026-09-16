-- Learners declare their GitHub handle and LinkedIn profile once; every
-- submitted URL is then checked against them, so a learner cannot submit
-- someone else's repo or post as their own.
alter table public.learners add column if not exists github_username text;
alter table public.learners add column if not exists linkedin_slug text;

-- Weekly LinkedIn posts are evidence in their own right, so they get a column.
alter table public.day_submissions add column if not exists linkedin_post_url text;
