-- ─────────────────────────────────────────────────────────────
--  Capture a GitHub profile at registration
--
--  The registration form now asks for a GitHub URL alongside LinkedIn, so
--  developer-track applicants can show work before the cohort starts. Both
--  stay optional. Additive and safe to run more than once.
-- ─────────────────────────────────────────────────────────────

alter table public.registrations add column if not exists github text;

comment on column public.registrations.github is
  'Optional GitHub profile URL given at registration. Not verified — the learner''s verified GitHub identity lives on public.learners.github_username.';
