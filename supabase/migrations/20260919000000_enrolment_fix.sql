-- The previous version returned void, so the app could not tell "enrolled"
-- from "silently did nothing". It also keyed off the stored registration's
-- track, which is stale when someone registers again with a different choice.
drop function if exists public.enrol_open_track(text);

create or replace function public.enrol_open_track(p_email text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  open_track constant text := 'project-manager';
begin
  -- Any registration for this email proves they came through the form.
  select name, email, cohort_start
    into r
  from public.registrations
  where lower(email) = lower(p_email)
  order by created_at desc
  limit 1;

  if not found then
    return false;
  end if;

  insert into public.learners (name, email, track, cohort_start)
  values (r.name, lower(r.email), open_track, r.cohort_start)
  on conflict (email) do nothing;

  -- True only when a place actually exists now.
  return exists (select 1 from public.learners where lower(email) = lower(p_email));
end;
$$;

revoke all on function public.enrol_open_track(text) from public;
grant execute on function public.enrol_open_track(text) to anon, authenticated;
