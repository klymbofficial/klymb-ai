-- ─────────────────────────────────────────────────────────────
--  Several tracks per person
--
--  course.learners was one row per email: one track for life. It becomes one
--  row per email per track, so the same person can take QA Engineer and
--  Junior Developer side by side. Everything already hangs off the learner
--  row's id (days, checkpoints, coach sessions, reminders), so each track
--  keeps its own 30 days without any of those tables changing.
--
--  user_id loses its uniqueness for the same reason: one app.klymb.ai account
--  now holds a row for each of its tracks.
--
--  A registration was one per email per intake; it becomes one per email per
--  track per intake, so registering for a second track is no longer refused as
--  a duplicate. Repeating the same track still is.
--
--  Safe while the previous release is live: this only widens what may be
--  stored. Until the new code ships nobody can create a second row, and every
--  query the old code runs still finds exactly one.
--
--  Idempotent: safe to run more than once.
-- ─────────────────────────────────────────────────────────────

-- The single-column unique constraints on email and on user_id, found by
-- their column rather than by name, so a differently named one still goes.
do $$
declare c record;
begin
  for c in
    select con.conname
      from pg_constraint con
      join pg_attribute att on att.attrelid = con.conrelid and att.attnum = con.conkey[1]
     where con.conrelid = 'course.learners'::regclass
       and con.contype = 'u'
       and array_length(con.conkey, 1) = 1
       and att.attname in ('email', 'user_id')
  loop
    execute format('alter table course.learners drop constraint %I', c.conname);
  end loop;
end $$;

create unique index if not exists learners_email_track_key on course.learners (email, track);
-- The device slot and sign-in look learners up by email alone.
create index if not exists learners_email_idx on course.learners (email);

create index if not exists learners_user_id_idx on course.learners (user_id) where user_id is not null;

drop index if exists course.registrations_email_cohort_key;
create unique index if not exists registrations_email_track_cohort_key
  on course.registrations (lower(email), track, cohort_start);
