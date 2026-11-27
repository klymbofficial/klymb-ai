-- ─────────────────────────────────────────────────────────────
--  The Claude Challenge takes enrolments
--
--  course.learners and course.registrations only allowed the six career
--  tracks, so every Claude Challenge sign-up was refused by the database.
--  Both now allow 'claude' too. The other challenges are not open yet and are
--  not added.
--
--  Safe while the previous release is live: this only widens what may be
--  stored.
--
--  Idempotent: safe to run more than once.
-- ─────────────────────────────────────────────────────────────

alter table course.learners drop constraint if exists learners_track_check;
alter table course.learners add constraint learners_track_check
  check (track in ('qa-engineer','l1-l2-support','project-manager','junior-developer','reporting-analyst','ai-product-manager','claude'));

alter table course.registrations drop constraint if exists registrations_track_check;
alter table course.registrations add constraint registrations_track_check
  check (track in ('qa-engineer','l1-l2-support','project-manager','junior-developer','reporting-analyst','ai-product-manager','claude'));
