-- Knowledge-check answers live with the day's submission so a reviewer sees
-- the work and the reasoning together.
alter table public.day_submissions add column if not exists quiz_answers jsonb;
