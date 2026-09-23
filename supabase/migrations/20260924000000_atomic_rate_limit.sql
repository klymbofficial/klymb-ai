-- ─────────────────────────────────────────────────────────────
--  Atomic rate limiting
--
--  The limiter used to COUNT recent attempts and then, one network round
--  trip later, INSERT the new one. Requests arriving together all counted
--  the same number and all passed: twenty simultaneous registrations from
--  one address went through a limit of five.
--
--  This function does the count and the insert inside one transaction, and
--  takes a transaction-scoped advisory lock on the (action, caller) pair
--  first, so concurrent callers with the same key queue behind each other
--  and each sees the attempts before it. Different callers never contend.
--
--  It also prunes attempts older than a day, occasionally, so the table
--  stays small without a scheduled job.
--
--  Additive and safe to run more than once.
-- ─────────────────────────────────────────────────────────────

create or replace function public.rate_limit_hit(
  p_action text,
  p_fingerprint text,
  p_limit integer,
  p_window_minutes integer
)
returns boolean
language plpgsql
security invoker
set search_path = public
as $$
declare
  recent integer;
begin
  if p_limit not between 1 and 1000 or p_window_minutes not between 1 and 1440 then
    raise exception 'rate_limit_hit: limit or window out of range';
  end if;

  -- Serialise only callers sharing this key; released at commit.
  perform pg_advisory_xact_lock(hashtextextended(p_action || ':' || p_fingerprint, 0));

  select count(*) into recent
    from public.rate_limit_events
   where action = p_action
     and fingerprint = p_fingerprint
     and created_at >= now() - make_interval(mins => p_window_minutes);

  if recent >= p_limit then
    return false;
  end if;

  insert into public.rate_limit_events (action, fingerprint) values (p_action, p_fingerprint);

  -- Roughly one call in a hundred sweeps out attempts nobody will count again.
  if random() < 0.01 then
    delete from public.rate_limit_events where created_at < now() - interval '1 day';
  end if;

  return true;
end;
$$;

revoke all on function public.rate_limit_hit(text, text, integer, integer) from public;
revoke all on function public.rate_limit_hit(text, text, integer, integer) from anon;
revoke all on function public.rate_limit_hit(text, text, integer, integer) from authenticated;
grant execute on function public.rate_limit_hit(text, text, integer, integer) to service_role;
