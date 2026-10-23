-- migrate: no-transaction
-- ─────────────────────────────────────────────────────────────
--  Indexes for the queries we actually run, and a rate limiter that
--  stops scanning its own table in the request path
--
--  Runs outside a transaction so the indexes can be built CONCURRENTLY —
--  writes keep working while they build. Every statement is `if not exists`
--  or `or replace`, so a failure part-way is fixed by running it again.
--
--  A note for later: if one of these ever fails mid-build, Postgres leaves an
--  INVALID index behind. Find it with
--    select indexrelid::regclass from pg_index where not indisvalid;
--  drop it, and re-run.
-- ─────────────────────────────────────────────────────────────

-- 1. ──────────────────────────────────────────────────────────
-- The one that was costing real latency.
--
-- rate_limit_hit pruned old attempts on roughly one call in a hundred, with
-- `where created_at < …`. The only index on the table led with (action,
-- fingerprint), so a filter on created_at alone could not use it: that prune
-- was a sequential scan of the whole table, and it happened inside a
-- registration request. The sweep moves to the hourly cron below; this index
-- is what makes it cheap there, and makes any created_at filter cheap here.
create index concurrently if not exists rate_limit_events_created
  on course.rate_limit_events (created_at);

-- 2. ──────────────────────────────────────────────────────────
-- hasPaid() runs on every locked day page: the exact predicate is
-- (email, track, status). The existing payments_email_idx leads with email,
-- so it worked, but only as a prefix — this answers the whole question.
create index concurrently if not exists payments_email_track_status
  on course.payments (email, track, status);

-- The admin payments table filters on status and sorts by created_at. With
-- no index for that shape it was a scan plus a sort.
create index concurrently if not exists payments_status_created
  on course.payments (status, created_at desc);

-- 3. ──────────────────────────────────────────────────────────
-- getEngagement filters submissions by submitted_at. day_submissions is
-- indexed by (learner_id, day) only, so the time filter had nothing to use.
create index concurrently if not exists day_submissions_submitted_at
  on course.day_submissions (submitted_at desc);

-- getLearnerProgress and the admin learner list order by created_at.
create index concurrently if not exists learners_created_at
  on course.learners (created_at desc);

-- 4. ──────────────────────────────────────────────────────────
-- Housekeeping, called once an hour by /api/cron/followups rather than from
-- a random 1% of user requests. Deletes in bounded batches so it never takes
-- a long lock on a big table, and returns what it removed.
--
-- Retention, and why:
--   rate_limit_events  1 day   — the longest window any caller asks for is 24h
--   sd_events         90 days  — course analytics; the admin UI never looks
--                                further back, and this is the only table
--                                whose growth is unbounded by learner count
create or replace function course.prune_old_rows(
  p_batch integer default 10000
)
returns table (table_name text, deleted bigint)
language plpgsql
security invoker
set search_path = course, pg_temp
as $$
declare
  n bigint;
begin
  with doomed as (
    select id from course.rate_limit_events
     where created_at < now() - interval '1 day'
     limit p_batch
  )
  delete from course.rate_limit_events r using doomed d where r.id = d.id;
  get diagnostics n = row_count;
  table_name := 'rate_limit_events'; deleted := n; return next;

  with doomed as (
    select id from course.sd_events
     where created_at < now() - interval '90 days'
     limit p_batch
  )
  delete from course.sd_events e using doomed d where e.id = d.id;
  get diagnostics n = row_count;
  table_name := 'sd_events'; deleted := n; return next;
end;
$$;

-- 5. ──────────────────────────────────────────────────────────
-- The limiter itself, without the sweep. Everything else is unchanged: the
-- transaction-scoped advisory lock still serialises only callers sharing a
-- key, so the count and the insert stay atomic against a burst.
create or replace function course.rate_limit_hit(
  p_action text,
  p_fingerprint text,
  p_limit integer,
  p_window_minutes integer
)
returns boolean
language plpgsql
security invoker
set search_path = course, pg_temp
as $$
declare
  recent integer;
begin
  if p_limit not between 1 and 1000 or p_window_minutes not between 1 and 1440 then
    raise exception 'rate_limit_hit: limit or window out of range';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_action || ':' || p_fingerprint, 0));

  select count(*) into recent
    from course.rate_limit_events
   where action = p_action
     and fingerprint = p_fingerprint
     and created_at >= now() - make_interval(mins => p_window_minutes);

  if recent >= p_limit then
    return false;
  end if;

  insert into course.rate_limit_events (action, fingerprint) values (p_action, p_fingerprint);
  return true;
end;
$$;
