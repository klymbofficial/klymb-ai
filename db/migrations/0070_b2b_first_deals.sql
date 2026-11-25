-- ─────────────────────────────────────────────────────────────
--  B2B: Anil Bajpai as an admin, and the first four company deals
--
--  Data, not schema: the first deals for Sales › B2B, owned by Anil Bajpai,
--  who works Sales as a sales manager (DEFAULT_SALES_MANAGERS in
--  src/lib/admin/access.ts) and so needs an admin_users row to sign in.
--  Asked for by Sarthak on 25 Nov 2026.
--
--    * Multisoft Systems Technology Consultancy Pvt Ltd (Noida): Document
--      needed. NDA sent, MSA and SOW being drafted.
--    * Dastek Software, Status Neo, PSquick IT (Digikraft): Lead.
--
--  Every open deal needs a next step with a date; each gets one for
--  27 Nov 2026, which Anil changes as he works them.
--
--  Idempotent: Anil is added only if missing, and a company that is already
--  in b2b_companies (by name, any case) is left alone with its deals.
-- ─────────────────────────────────────────────────────────────

insert into course.admin_users (email, name)
values ('anilbajpai1987@gmail.com', 'Anil Bajpai')
on conflict (email) do nothing;

insert into course.admin_audit_log (admin_email, action, target, details)
select 'klymbofficial@gmail.com', 'admin.add', 'anilbajpai1987@gmail.com',
       '{"name": "Anil Bajpai", "via": "db/migrations/0070_b2b_first_deals.sql"}'::jsonb
 where not exists (
   select 1 from course.admin_audit_log
    where action = 'admin.add' and target = 'anilbajpai1987@gmail.com');

do $$
declare
  owner constant text := 'anilbajpai1987@gmail.com';
  by_email constant text := 'klymbofficial@gmail.com';
  d record;
  company uuid;
  deal uuid;
begin
  for d in
    select * from (values
      ('Multisoft Systems Technology Consultancy Pvt Ltd', 'Noida', 'CEO reportedly Ashish Bakshi (not confirmed).',
       'Multisoft: corporate training', 'document_needed', 'Get the NDA signed'),
      ('Dastek Software', null, null, 'Dastek Software: corporate training', 'lead', 'First call to qualify'),
      ('Status Neo', null, null, 'Status Neo: corporate training', 'lead', 'First call to qualify'),
      ('PSquick IT (Digikraft)', null, null, 'PSquick IT (Digikraft): corporate training', 'lead', 'First call to qualify')
    ) as v(name, city, notes, title, stage, next_step)
  loop
    if exists (select 1 from course.b2b_companies where lower(name) = lower(d.name)) then
      continue;
    end if;

    insert into course.b2b_companies (name, city, notes, created_by)
    values (d.name, d.city, d.notes, by_email)
    returning id into company;

    insert into course.b2b_deals (company_id, title, stage, owner_email, source, next_step, next_step_date, created_by)
    values (company, d.title, d.stage, owner, 'outbound', d.next_step, date '2026-11-27', by_email)
    returning id into deal;

    -- The paperwork checklist, as a new deal starts in the app, with
    -- Multisoft's NDA already sent and its MSA and SOW in drafting.
    insert into course.b2b_deal_docs (deal_id, kind, status, sent_on, updated_by)
    select deal, k.kind,
           case when d.stage = 'document_needed' and k.kind = 'nda' then 'sent'
                when d.stage = 'document_needed' and k.kind in ('msa', 'sow') then 'drafting'
                else k.status end,
           case when d.stage = 'document_needed' and k.kind = 'nda' then date '2026-11-25' end,
           by_email
      from (values ('proposal', 'pending'), ('nda', 'pending'), ('msa', 'pending'), ('sow', 'pending'),
                   ('po', 'not_needed'), ('invoice', 'not_needed')) as k(kind, status);

    insert into course.b2b_stage_history (deal_id, from_stage, to_stage, by_email)
    values (deal, null, 'lead', by_email);
    if d.stage <> 'lead' then
      insert into course.b2b_stage_history (deal_id, from_stage, to_stage, by_email)
      values (deal, 'lead', d.stage, by_email);
    end if;
  end loop;
end $$;
