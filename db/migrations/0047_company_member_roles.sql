-- ─────────────────────────────────────────────────────────────
--  Company memberships: several workspaces per email, one row per role
--
--  1. One person, several companies. company_members was keyed by email
--     alone, so nobody could belong to two companies. The key becomes
--     (company_id, email), which 0030 already holds as a unique constraint.
--     The sign-in code stays one per email (a code proves the mailbox, not a
--     company), so its foreign key to company_members(email) goes; the code
--     store already checks for an active membership on every use.
--
--  2. Several responsibilities per person. company_member_roles holds one
--     row per responsibility a person has in a company:
--
--       admin         runs the company's workspace (was "hr")
--       company_head  sees the whole company, changes nothing
--       recruiter     hiring batches (arrive with T04/T06)
--       reviewer      reviews hiring work (arrives with T08)
--       team_lead     sees their team; team_id says which (was "head")
--       employee      their own learning
--
--     One lead per team, among the rows that exist: a removed person's rows
--     are deleted when they are removed, and given again if they come back.
--
--  3. company_members.role stays, kept right by a trigger, for the code that
--     is live while this runs and for the constraints that read it (a head
--     has a team; one head per team). It is derived: admin → hr, else a lead
--     of their own team → head, else employee. New code reads the roles table
--     and falls back to this column only when the table isn't there yet.
--
--  Backfills every active member from their current role.
--
--  While this runs, the previous release's "add person" statement (which
--  names the old email key in ON CONFLICT) fails and tells HR to try again in
--  a minute. Nothing else in that release depends on the old key.
--
--  Idempotent: safe to run more than once.
-- ─────────────────────────────────────────────────────────────

-- ── 1. Several companies per email ──────────────────────────

alter table course.company_signin_codes drop constraint if exists company_signin_codes_email_fkey;

do $$
begin
  if exists (
    select 1 from pg_constraint
     where conrelid = 'course.company_members'::regclass and contype = 'p'
       and pg_get_constraintdef(oid) = 'PRIMARY KEY (email)'
  ) then
    alter table course.company_members drop constraint company_members_pkey;
    alter table course.company_members add constraint company_members_pkey primary key (company_id, email);
  end if;
end $$;

-- The sign-in code store and /org look a person up by email alone.
create index if not exists company_members_email_idx on course.company_members (email);

-- ── 2. One row per responsibility ───────────────────────────

create table if not exists course.company_member_roles (
  company_id uuid not null,
  email text not null,
  role text not null
    constraint company_member_roles_role_check
    check (role in ('admin', 'company_head', 'recruiter', 'reviewer', 'team_lead', 'employee')),
  -- The team a team_lead leads, and nothing for every other role.
  team_id uuid,
  granted_by text,
  granted_at timestamptz not null default now(),
  primary key (company_id, email, role),
  constraint company_member_roles_member
    foreign key (company_id, email) references course.company_members (company_id, email)
    on delete cascade on update cascade,
  constraint company_member_roles_team
    foreign key (company_id, team_id) references course.teams (company_id, id) on delete cascade,
  constraint company_member_roles_lead_has_team
    check ((role = 'team_lead') = (team_id is not null))
);

-- One lead per team. Deferrable, like 0013's rule, so changing a team's lead
-- removes the old row and adds the new one in one statement.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'company_member_roles_one_lead_per_team') then
    alter table course.company_member_roles
      add constraint company_member_roles_one_lead_per_team
      exclude using btree (team_id with =) where (role = 'team_lead')
      deferrable initially deferred;
  end if;
end $$;

-- Every active member's current role, once.
insert into course.company_member_roles (company_id, email, role, team_id, granted_by)
select m.company_id, m.email,
       case m.role when 'hr' then 'admin' when 'head' then 'team_lead' else 'employee' end,
       case when m.role = 'head' then m.team_id end,
       'migration 0047'
  from course.company_members m
 where m.removed_at is null
on conflict (company_id, email, role) do nothing;

-- ── 3. The old role column, derived ─────────────────────────

create or replace function course.company_member_legacy_role(p_company uuid, p_email text)
returns text
language sql
stable
as $$
  select case
           when bool_or(r.role = 'admin') then 'hr'
           when bool_or(r.role = 'team_lead' and r.team_id = m.team_id) then 'head'
           else 'employee'
         end
    from course.company_members m
    left join course.company_member_roles r on r.company_id = m.company_id and r.email = m.email
   where m.company_id = p_company and m.email = p_email
$$;

create or replace function course.sync_company_member_role()
returns trigger
language plpgsql
as $$
begin
  if tg_op in ('DELETE', 'UPDATE') then
    update course.company_members m
       set role = course.company_member_legacy_role(m.company_id, m.email)
     where m.company_id = old.company_id and m.email = old.email
       and m.role is distinct from course.company_member_legacy_role(m.company_id, m.email);
  end if;
  if tg_op in ('INSERT', 'UPDATE') then
    update course.company_members m
       set role = course.company_member_legacy_role(m.company_id, m.email)
     where m.company_id = new.company_id and m.email = new.email
       and m.role is distinct from course.company_member_legacy_role(m.company_id, m.email);
  end if;
  return null;
end;
$$;

drop trigger if exists company_member_roles_sync on course.company_member_roles;
create trigger company_member_roles_sync
  after insert or update or delete on course.company_member_roles
  for each row execute function course.sync_company_member_role();

create index if not exists company_member_roles_email_idx on course.company_member_roles (email);
