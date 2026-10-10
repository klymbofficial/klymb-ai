-- ─────────────────────────────────────────────────────────────
--  A sixth track: AI Product Manager (free)
--
--  Widens the track allowlist on every table that stores a track.
--  Postgres names an inline column check <table>_track_check.
--  Additive and safe to run more than once.
-- ─────────────────────────────────────────────────────────────

alter table public.registrations drop constraint if exists registrations_track_check;
alter table public.registrations add constraint registrations_track_check
  check (track in ('qa-engineer','l1-l2-support','project-manager','junior-developer','reporting-analyst','ai-product-manager'));

alter table public.learners drop constraint if exists learners_track_check;
alter table public.learners add constraint learners_track_check
  check (track in ('qa-engineer','l1-l2-support','project-manager','junior-developer','reporting-analyst','ai-product-manager'));

alter table public.payments drop constraint if exists payments_track_check;
alter table public.payments add constraint payments_track_check
  check (track in ('qa-engineer','l1-l2-support','project-manager','junior-developer','reporting-analyst','ai-product-manager'));
