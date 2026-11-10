-- ─────────────────────────────────────────────────────────────
--  Company course assignments (pilot)
--
--  An active company seat opens one existing course, but only for the people
--  HR assigns it to. Access is read live from this table joined to
--  company_members, so it is never copied anywhere that could go stale:
--
--    access = an active member (removed_at is null)
--             + a non-revoked assignment in that same company
--             + a Google-verified sign-in with exactly that email
--
--  It is deliberately NOT a row in course.enrollments. Enrollments mean "paid
--  for the course": the reminder, release and push crons email every active
--  one, and refunds act on them. A company seat must do none of that.
--
--  * (company_id, email) is a foreign key to company_members, so an assignment
--    can only ever name a member of its own company; removing the member
--    deletes the row, and a member can't move companies (email is their key).
--  * revoked_at/revoked_by: HR removes an assignment by stamping these, not by
--    deleting the row, so who assigned and who removed it is kept. Assigning
--    again clears them.
--  * course is limited to the one course that exists for this today.
--
--  Number 0030: main ends at 0025; the older audit branch holds 0025_several_tracks
--  and 0026-0029. Nothing on any branch uses 0030.
--
--  Idempotent: safe to run more than once.
-- ─────────────────────────────────────────────────────────────

-- Lets assignments point at (company, email) together. Redundant with the
-- email primary key, so it can't fail on existing rows.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'company_members_company_email_key') then
    alter table course.company_members
      add constraint company_members_company_email_key unique (company_id, email);
  end if;
end $$;

create table if not exists course.company_course_assignments (
  email text not null
    constraint company_course_assignments_email_lowercase check (email = lower(email)),
  company_id uuid not null,
  course text not null
    constraint company_course_assignments_course check (course in ('system-design')),
  assigned_by text not null,
  assigned_at timestamptz not null default now(),
  revoked_at timestamptz,
  revoked_by text,
  primary key (email, course),
  constraint company_course_assignments_member
    foreign key (company_id, email) references course.company_members (company_id, email)
    on delete cascade on update cascade,
  constraint company_course_assignments_revoked_pair
    check ((revoked_at is null) = (revoked_by is null))
);

create index if not exists company_course_assignments_company_idx
  on course.company_course_assignments (company_id, course) where revoked_at is null;
