-- ─────────────────────────────────────────────────────────────
--  Company assignments: what was assigned, to whom, by whom
--
--  0030 kept one row per person and course, so a team assignment, a due
--  date or "recommended, not required" had nowhere to go, and one email
--  could hold the course through one company only. This splits it in two:
--
--    company_assignments            one row per assignment someone confirmed:
--                                   course, required or recommended, due date
--                                   (required only), what it targeted (some
--                                   people, a team, everyone), who and when.
--                                   request_key makes a retried submit land
--                                   once.
--    company_assignment_recipients  the people it reached, fixed when it was
--                                   confirmed: someone joining the team later
--                                   isn't added. Taking it back stamps the
--                                   row; it is never deleted.
--
--  One live assignment per person, course and company: a partial unique
--  index, so a retry or two admins at once can't give someone the course
--  twice.
--
--  Every 0030 row moves over as a required assignment to that one person,
--  revoked rows included. A trigger keeps course.company_course_assignments
--  in step, so a release still reading it (a preview, or a rollback) sees
--  the same people; nothing new reads it.
--
--  Idempotent: safe to run more than once.
-- ─────────────────────────────────────────────────────────────

create table if not exists course.company_assignments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references course.companies (id) on delete cascade,
  course text not null
    constraint company_assignments_course check (course in ('system-design')),
  requirement text not null
    constraint company_assignments_requirement check (requirement in ('required', 'recommended')),
  due_on date,
  constraint company_assignments_due_required check (requirement = 'required' or due_on is null),
  target_kind text not null
    constraint company_assignments_target_kind check (target_kind in ('people', 'team', 'everyone')),
  -- The team it targeted; null after the team is deleted. The label keeps what it was called.
  target_team_id uuid,
  target_label text not null
    constraint company_assignments_target_label check (char_length(target_label) between 1 and 120),
  constraint company_assignments_team_target check (target_kind = 'team' or target_team_id is null),
  constraint company_assignments_team
    foreign key (company_id, target_team_id) references course.teams (company_id, id) on delete set null (target_team_id),
  request_key uuid not null,
  created_by text not null,
  created_at timestamptz not null default now(),
  constraint company_assignments_request_once unique (company_id, request_key),
  constraint company_assignments_id_company_course unique (id, company_id, course)
);

create index if not exists company_assignments_company_idx on course.company_assignments (company_id, created_at desc);

create table if not exists course.company_assignment_recipients (
  assignment_id uuid not null,
  company_id uuid not null,
  email text not null
    constraint company_assignment_recipients_email_lowercase check (email = lower(email)),
  course text not null,
  added_at timestamptz not null default now(),
  revoked_at timestamptz,
  revoked_by text,
  primary key (assignment_id, email),
  constraint company_assignment_recipients_assignment
    foreign key (assignment_id, company_id, course) references course.company_assignments (id, company_id, course) on delete cascade,
  constraint company_assignment_recipients_member
    foreign key (company_id, email) references course.company_members (company_id, email) on delete cascade on update cascade,
  constraint company_assignment_recipients_revoked_pair check ((revoked_at is null) = (revoked_by is null))
);

-- One live assignment per person, course and company.
create unique index if not exists company_assignment_recipients_live
  on course.company_assignment_recipients (company_id, email, course) where revoked_at is null;
create index if not exists company_assignment_recipients_email_idx
  on course.company_assignment_recipients (email, course) where revoked_at is null;

-- ── Moving 0030's rows over ──────────────────────────────────
-- Each old row becomes its own assignment. Its request key is derived from
-- the row, so a second run finds it and adds nothing.
insert into course.company_assignments (company_id, course, requirement, target_kind, target_label, request_key, created_by, created_at)
select a.company_id, a.course, 'required', 'people', a.email, md5('0030:' || a.email || ':' || a.course)::uuid, a.assigned_by, a.assigned_at
  from course.company_course_assignments a
on conflict (company_id, request_key) do nothing;

insert into course.company_assignment_recipients (assignment_id, company_id, email, course, added_at, revoked_at, revoked_by)
select n.id, a.company_id, a.email, a.course, a.assigned_at, a.revoked_at, a.revoked_by
  from course.company_course_assignments a
  join course.company_assignments n
    on n.company_id = a.company_id and n.request_key = md5('0030:' || a.email || ':' || a.course)::uuid
on conflict do nothing;

-- ── Keeping 0030's table in step for older code ──────────────
create or replace function course.company_assignment_recipients_legacy()
returns trigger
language plpgsql
as $$
begin
  if new.revoked_at is null then
    insert into course.company_course_assignments as a (email, company_id, course, assigned_by, assigned_at)
    select new.email, new.company_id, new.course, n.created_by, new.added_at
      from course.company_assignments n where n.id = new.assignment_id
    on conflict (email, course) do update
       set company_id = excluded.company_id, assigned_by = excluded.assigned_by, assigned_at = excluded.assigned_at,
           revoked_at = null, revoked_by = null;
  else
    update course.company_course_assignments
       set revoked_at = new.revoked_at, revoked_by = new.revoked_by
     where email = new.email and course = new.course and company_id = new.company_id and revoked_at is null;
  end if;
  return null;
end;
$$;

drop trigger if exists company_assignment_recipients_legacy on course.company_assignment_recipients;
create trigger company_assignment_recipients_legacy
  after insert or update of revoked_at on course.company_assignment_recipients
  for each row execute function course.company_assignment_recipients_legacy();
