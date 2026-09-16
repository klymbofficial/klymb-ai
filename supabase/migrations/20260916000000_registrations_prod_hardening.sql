-- Production hardening for the public registration form.

-- One registration per email per cohort: a repeat submit updates nothing and
-- returns a duplicate error the app turns into a friendly message.
create unique index if not exists registrations_email_cohort_key
  on public.registrations (lower(email), cohort_start);

-- Basic shape guard so junk cannot be stored even if the app is bypassed.
alter table public.registrations
  drop constraint if exists registrations_email_shape;
alter table public.registrations
  add constraint registrations_email_shape
  check (email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]{2,}$');
