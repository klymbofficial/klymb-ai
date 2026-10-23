-- ─────────────────────────────────────────────────────────────
--  Built for thousands of learners, with System Design as the funnel
--
--  Two changes, for the two things that break first.
--
--  1. Commit counts move onto the learner row.
--
--     getLearnerProgress called commitDays() per learner, and commitDays makes
--     up to three GitHub requests (three pages of 100 commits). One admin page
--     load at ~1,700 learners therefore exhausts GitHub's whole 5,000/hour
--     budget — and that budget is shared with checkFreshPush, which learners
--     depend on to submit. The admin page now reads stored numbers; the hourly
--     cron refreshes the stalest learners in a bounded batch.
--
--  2. sd_events becomes monthly partitions.
--
--     It is the only table whose growth is driven by visitors rather than by
--     enrolments, and the free course is the top of the funnel: a few thousand
--     learners across a 21-day course streaming events every few seconds is
--     millions of rows. Partitioning is being done now, while the table is
--     effectively empty, because converting a large one later means copying it
--     under a lock. The payoff is retention: dropping a month is instant and
--     reclaims the space, where deleting a month of rows is a long write
--     transaction that leaves the space behind as bloat until a vacuum.
--
--     Retention keeps whole calendar months — the current one plus
--     p_keep_sd_months before it — so the window is between three and four
--     months wide depending on the day, not a flat ninety days.
--
--  Idempotent: safe to run more than once.
-- ─────────────────────────────────────────────────────────────

-- 1. ──────────────────────────────────────────────────────────
alter table course.learners add column if not exists commit_repo text;
alter table course.learners add column if not exists commit_days integer;
alter table course.learners add column if not exists commits_checked_at timestamptz;

comment on column course.learners.commit_days is
  'Distinct days this learner pushed to commit_repo, counted by the hourly cron. Null means not checked yet, not zero commits.';

-- The refresh picks the stalest first, so this is the order it reads in.
create index if not exists learners_commits_stale
  on course.learners (commits_checked_at nulls first)
  where github_username is not null;

-- 2. ──────────────────────────────────────────────────────────
-- Monthly partitions. A partitioned table's primary key has to contain the
-- partition key, so the key becomes (id, created_at); nothing references
-- sd_events.id, so that costs us nothing.
do $$
declare
  already boolean;
  moved bigint;
  part_month date;
begin
  select exists (
    select 1 from pg_partitioned_table pt
      join pg_class c on c.oid = pt.partrelid
     where c.relname = 'sd_events' and c.relnamespace = 'course'::regnamespace
  ) into already;

  if already then
    raise notice 'course.sd_events is already partitioned — nothing to do.';
    return;
  end if;

  alter table course.sd_events rename to sd_events_unpartitioned;

  -- Renaming a table leaves its indexes under their original names, which
  -- would collide with the ones created on the partitioned table below. The
  -- copy that follows is a full scan and needs none of them.
  drop index if exists course.sd_events_created;
  drop index if exists course.sd_events_anon_created;
  drop index if exists course.sd_events_lesson_event;

  create table course.sd_events (
    id bigint generated always as identity,
    created_at timestamptz not null default now(),
    anon_id text not null,
    email text,
    event text not null,
    lesson text,
    step text,
    props jsonb not null default '{}'::jsonb,
    path text,
    lang text,
    device text,
    primary key (id, created_at)
  ) partition by range (created_at);

  -- Indexes on the parent propagate to every partition, now and later.
  create index sd_events_created on course.sd_events (created_at desc);
  create index sd_events_anon_created on course.sd_events (anon_id, created_at desc);
  create index sd_events_lesson_event on course.sd_events (lesson, event);

  -- A partition for every month the existing rows actually span, created
  -- before the copy. This order matters: a row that lands in the default
  -- partition permanently blocks attaching a partition whose range would
  -- claim it, so the months have to exist first.
  for part_month in
    select distinct date_trunc('month', created_at)::date
      from course.sd_events_unpartitioned
     order by 1
  loop
    execute format(
      'create table course.%I partition of course.sd_events for values from (%L) to (%L)',
      'sd_events_' || to_char(part_month, 'YYYY_MM'), part_month, (part_month + interval '1 month')::date
    );
  end loop;

  -- Anything outside a month we made. Without it an insert for an unexpected
  -- date fails outright, which would mean dropping events.
  create table course.sd_events_default partition of course.sd_events default;

  insert into course.sd_events (created_at, anon_id, email, event, lesson, step, props, path, lang, device)
  select created_at, anon_id, email, event, lesson, step, props, path, lang, device
    from course.sd_events_unpartitioned;
  get diagnostics moved = row_count;
  raise notice 'moved % row(s) into the partitioned table', moved;

  drop table course.sd_events_unpartitioned;
end $$;

-- Creates the current month and the next few, so an insert never lands in the
-- default partition under normal operation. Called hourly by the cron.
create or replace function course.ensure_sd_partitions(p_months_ahead integer default 2)
returns integer
language plpgsql
security invoker
set search_path = course, pg_temp
as $$
declare
  start_month date;
  part_name text;
  made integer := 0;
begin
  for i in 0..greatest(p_months_ahead, 0) loop
    start_month := (date_trunc('month', now()) + make_interval(months => i))::date;
    part_name := 'sd_events_' || to_char(start_month, 'YYYY_MM');
    if not exists (
      select 1 from pg_class
       where relname = part_name and relnamespace = 'course'::regnamespace
    ) then
      begin
        execute format(
          'create table course.%I partition of course.sd_events for values from (%L) to (%L)',
          part_name, start_month, (start_month + interval '1 month')::date
        );
        made := made + 1;
      exception when others then
        -- A row already in the default partition for this month blocks it.
        -- Worth a notice, never worth failing the hourly cron over.
        raise notice 'could not create %: %', part_name, sqlerrm;
      end;
    end if;
  end loop;
  return made;
end;
$$;

-- Retention by dropping whole months. The name carries the month, which is
-- why they are named the way they are: reading a partition's bounds out of
-- the catalogs is far more fragile than this.
create or replace function course.drop_old_sd_partitions(p_keep_months integer default 3)
returns integer
language plpgsql
security invoker
set search_path = course, pg_temp
as $$
declare
  cutoff date;
  r record;
  dropped integer := 0;
begin
  cutoff := (date_trunc('month', now()) - make_interval(months => greatest(p_keep_months, 1)))::date;
  for r in
    select c.relname
      from pg_class c
     where c.relnamespace = 'course'::regnamespace
       and c.relname ~ '^sd_events_[0-9]{4}_[0-9]{2}$'
  loop
    if to_date(right(r.relname, 7), 'YYYY_MM') < cutoff then
      execute format('drop table course.%I', r.relname);
      dropped := dropped + 1;
    end if;
  end loop;
  return dropped;
end;
$$;

-- 3. ──────────────────────────────────────────────────────────
-- One entry point for the hourly cron. Replaces prune_old_rows, which only
-- knew how to delete rows.
drop function if exists course.prune_old_rows(integer);

create or replace function course.maintenance(
  p_batch integer default 10000,
  p_keep_sd_months integer default 3
)
returns table (task text, result bigint)
language plpgsql
security invoker
set search_path = course, pg_temp
as $$
declare
  n bigint;
begin
  -- Rate-limit attempts are deleted rather than partitioned: the table is
  -- small by design and the window any caller asks for is at most a day.
  with doomed as (
    select id from course.rate_limit_events
     where created_at < now() - interval '1 day'
     limit greatest(p_batch, 1)
  )
  delete from course.rate_limit_events r using doomed d where r.id = d.id;
  get diagnostics n = row_count;
  task := 'rate_limit_events deleted'; result := n; return next;

  task := 'sd partitions created'; result := course.ensure_sd_partitions(2); return next;
  task := 'sd partitions dropped'; result := course.drop_old_sd_partitions(p_keep_sd_months); return next;
end;
$$;

-- Make this run's partitions exist immediately, rather than waiting an hour.
select course.ensure_sd_partitions(2);
