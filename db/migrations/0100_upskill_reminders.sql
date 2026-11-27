-- ─────────────────────────────────────────────────────────────
--  Upskill course page (decided by the user 26 Nov 2026)
--
--    upskill_reminders           each "Send a reminder" email from a person's
--                                panel: who, by whom, when, and whether it
--                                went. One per person per course a day.
--    change_learner_assignment() changes one person's requirement and due
--                                date. Those live on the assignment, which
--                                can cover many people, so when others share
--                                it the person moves to an assignment of
--                                their own (their old row is revoked, with
--                                who did it). A team lead's change is limited
--                                to their own team. All in one step.
--
--  New table and function; the previous release reads neither. Idempotent.
-- ─────────────────────────────────────────────────────────────

create table if not exists course.upskill_reminders (
  id bigint generated always as identity primary key,
  company_id uuid not null references course.companies (id) on delete cascade,
  email text not null
    constraint upskill_reminders_email_lowercase check (email = lower(email)),
  course text not null constraint upskill_reminders_course check (course in ('system-design')),
  sent_by text not null,
  sent_at timestamptz not null default now(),
  outcome text not null constraint upskill_reminders_outcome check (outcome in ('sent', 'failed'))
);

create index if not exists upskill_reminders_person_idx on course.upskill_reminders (company_id, course, email, sent_at desc);

create or replace function course.change_learner_assignment(
  p_company uuid, p_email text, p_course text, p_requirement text, p_due date, p_by text, p_scope_team uuid, p_label text
) returns text
language plpgsql
as $$
declare
  v_assignment uuid;
  v_others int;
  v_new uuid;
begin
  if p_requirement not in ('required', 'recommended') then return 'invalid'; end if;
  if p_requirement = 'recommended' then p_due := null; end if;

  select r.assignment_id into v_assignment
    from course.company_assignment_recipients r
    join course.company_members m on m.company_id = r.company_id and m.email = r.email and m.removed_at is null
   where r.company_id = p_company and r.email = p_email and r.course = p_course and r.revoked_at is null
     and (p_scope_team is null or m.team_id = p_scope_team)
   for update of r;
  if v_assignment is null then return 'none'; end if;

  select count(*) into v_others
    from course.company_assignment_recipients
   where assignment_id = v_assignment and email <> p_email and revoked_at is null;

  if v_others = 0 then
    update course.company_assignments set requirement = p_requirement, due_on = p_due where id = v_assignment;
    return 'updated';
  end if;

  update course.company_assignment_recipients
     set revoked_at = now(), revoked_by = p_by
   where assignment_id = v_assignment and email = p_email and revoked_at is null;

  insert into course.company_assignments (company_id, course, requirement, due_on, target_kind, target_label, request_key, created_by)
  values (p_company, p_course, p_requirement, p_due, 'people', left(p_label, 120), gen_random_uuid(), p_by)
  returning id into v_new;

  insert into course.company_assignment_recipients (assignment_id, company_id, email, course)
  values (v_new, p_company, p_email, p_course);
  return 'moved';
end;
$$;
