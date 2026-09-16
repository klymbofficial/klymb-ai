-- Registering for an open track enrols you, so you can start Day 1 immediately.
-- SECURITY DEFINER, but it only ever copies a registration that already exists
-- for an open track — the public cannot invent learner rows with it.
create or replace function public.enrol_open_track(p_email text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare r record;
begin
  select name, email, track, cohort_start
    into r
  from public.registrations
  where lower(email) = lower(p_email)
    and track = 'project-manager'   -- the only track open for enrolment
  order by created_at desc
  limit 1;

  if not found then
    return;
  end if;

  insert into public.learners (name, email, track, cohort_start)
  values (r.name, lower(r.email), r.track, r.cohort_start)
  on conflict (email) do nothing;
end;
$$;

revoke all on function public.enrol_open_track(text) from public;
grant execute on function public.enrol_open_track(text) to anon, authenticated;
