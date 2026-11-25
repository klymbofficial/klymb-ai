-- ─────────────────────────────────────────────────────────────
--  B2B: Cognify as a lead for Anil Bajpai
--
--  Data, not schema. Asked for by Sarthak on 25 Nov 2026. Same shape as the
--  leads in 0070: stage Lead, owner Anil, next step "First call to qualify"
--  on 27 Nov 2026, and the paperwork checklist a new deal starts with.
--
--  Idempotent: skipped if a company named Cognify (any case) already exists.
-- ─────────────────────────────────────────────────────────────

do $$
declare
  owner constant text := 'anilbajpai1987@gmail.com';
  by_email constant text := 'klymbofficial@gmail.com';
  company uuid;
  deal uuid;
begin
  if exists (select 1 from course.b2b_companies where lower(name) = 'cognify') then
    return;
  end if;

  insert into course.b2b_companies (name, created_by)
  values ('Cognify', by_email)
  returning id into company;

  insert into course.b2b_deals (company_id, title, stage, owner_email, source, next_step, next_step_date, created_by)
  values (company, 'Cognify: corporate training', 'lead', owner, 'outbound', 'First call to qualify', date '2026-11-27', by_email)
  returning id into deal;

  insert into course.b2b_deal_docs (deal_id, kind, status, updated_by)
  select deal, k.kind, k.status, by_email
    from (values ('proposal', 'pending'), ('nda', 'pending'), ('msa', 'pending'), ('sow', 'pending'),
                 ('po', 'not_needed'), ('invoice', 'not_needed')) as k(kind, status);

  insert into course.b2b_stage_history (deal_id, from_stage, to_stage, by_email)
  values (deal, null, 'lead', by_email);
end $$;
