-- ─────────────────────────────────────────────────────────────
--  B2B: companies we sell to, their people, deals and paperwork
--
--  Admin › Sales › B2B, for owners and sales managers only (never reps).
--  Kept apart from course.sales_leads, which is one person each, matched to
--  payments and filled from website forms; a B2B deal is a company, several
--  people, seats, a value and documents.
--
--    * b2b_companies       one company (an "account"). It can have many
--                          deals: a pilot, then more seats. company_id links
--                          its /org workspace once one is created.
--    * b2b_contacts        the people there, with their part in the decision.
--    * b2b_deals           one sale: seats, value, stage, next step, owner.
--    * b2b_deal_docs       the paperwork checklist, one row per document.
--    * b2b_activities      each call, message, meeting or note, and who did it.
--    * b2b_tasks           to-dos on a deal, with a due date.
--    * b2b_stage_history   every stage move, for cycle time and win rate.
--
--  Old sales_leads with kind = 'b2b' stay where they are.
--  Grants come from 0002's default privileges. Idempotent.
-- ─────────────────────────────────────────────────────────────

create table if not exists course.b2b_companies (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text not null check (char_length(name) between 1 and 160),
  industry text check (char_length(industry) <= 80),
  employees text check (employees in ('1-50', '51-200', '201-1000', '1001-5000', '5000+')),
  city text check (char_length(city) <= 80),
  website text check (char_length(website) <= 300),
  linkedin text check (char_length(linkedin) <= 300),
  -- Their GSTIN, for their invoice. Klymb itself has none.
  gstin text check (gstin ~ '^[0-9A-Z]{15}$'),
  billing_address text check (char_length(billing_address) <= 500),
  notes text check (char_length(notes) <= 2000),
  -- The /org workspace, once the deal is signed and one is created.
  company_id uuid references course.companies (id) on delete set null,
  created_by text
);

create unique index if not exists b2b_companies_name_key on course.b2b_companies (lower(name));
create unique index if not exists b2b_companies_workspace_key on course.b2b_companies (company_id) where company_id is not null;

create table if not exists course.b2b_contacts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  company_id uuid not null references course.b2b_companies (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  designation text check (char_length(designation) <= 120),
  buying_role text not null default 'other'
    check (buying_role in ('decision_maker', 'champion', 'hr_ld', 'finance', 'legal_signer', 'other')),
  email text check (email = lower(email) and char_length(email) <= 200),
  -- Digits with country code, as in sales_leads.
  phone text check (phone ~ '^[0-9]{8,15}$'),
  linkedin text check (char_length(linkedin) <= 300),
  is_primary boolean not null default false
);

create index if not exists b2b_contacts_company_idx on course.b2b_contacts (company_id);
-- One main contact per company.
create unique index if not exists b2b_contacts_primary_key on course.b2b_contacts (company_id) where is_primary;

create table if not exists course.b2b_deals (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  company_id uuid not null references course.b2b_companies (id) on delete restrict,
  title text not null check (char_length(title) between 1 and 160),
  stage text not null default 'lead'
    check (stage in ('lead', 'in_progress', 'in_discussion', 'document_needed', 'signed', 'on_hold', 'lost')),
  stage_changed_at timestamptz not null default now(),
  signed_at timestamptz,
  lost_reason text
    check (lost_reason in ('price', 'no_budget', 'competitor', 'timing', 'no_response', 'not_a_fit', 'in_house', 'other')),
  lost_note text check (char_length(lost_note) <= 300),
  owner_email text,
  source text not null default 'outbound'
    check (source in ('outbound', 'inbound', 'referral', 'event', 'partner', 'linkedin', 'other')),
  courses text check (char_length(courses) <= 200),
  seats integer not null default 0 check (seats between 0 and 100000),
  -- Rupees, whole. value_inr is the deal's total: seats × price − discount
  -- when a per-seat price is set, otherwise the amount typed in.
  price_per_seat integer check (price_per_seat between 0 and 10000000),
  discount_inr integer not null default 0 check (discount_inr between 0 and 1000000000),
  value_inr integer not null default 0 check (value_inr between 0 and 1000000000),
  payment_terms text check (payment_terms in ('advance', 'split_50_50', 'milestones', 'net_30', 'net_45', 'other')),
  payment_status text not null default 'not_due'
    check (payment_status in ('not_due', 'invoiced', 'part_paid', 'paid')),
  po_number text check (char_length(po_number) <= 80),
  delivery_mode text check (delivery_mode in ('self_paced', 'live_online', 'onsite', 'hybrid')),
  expected_close date,
  cohort_start date,
  renewal_date date,
  next_step text check (char_length(next_step) <= 200),
  next_step_date date,
  status_note text check (char_length(status_note) <= 120),
  notes text check (char_length(notes) <= 4000),
  created_by text,
  check ((stage = 'lost') = (lost_reason is not null))
);

create index if not exists b2b_deals_company_idx on course.b2b_deals (company_id);
create index if not exists b2b_deals_next_idx on course.b2b_deals (owner_email, next_step_date);
create index if not exists b2b_deals_stage_idx on course.b2b_deals (stage);

create table if not exists course.b2b_deal_docs (
  deal_id uuid not null references course.b2b_deals (id) on delete cascade,
  kind text not null check (kind in ('proposal', 'nda', 'msa', 'sow', 'po', 'invoice')),
  status text not null default 'pending'
    check (status in ('not_needed', 'pending', 'drafting', 'sent', 'client_review', 'signed')),
  version text check (char_length(version) <= 20),
  sent_on date,
  signed_on date,
  -- Who signed for the client.
  client_signer text check (char_length(client_signer) <= 120),
  -- A Drive or PDF link. The site stores no files.
  link text check (link ~ '^https://' and char_length(link) <= 2000),
  updated_at timestamptz not null default now(),
  updated_by text,
  primary key (deal_id, kind)
);

create table if not exists course.b2b_activities (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  deal_id uuid not null references course.b2b_deals (id) on delete cascade,
  by_email text not null,
  kind text not null check (kind in ('call', 'whatsapp', 'email', 'meeting', 'linkedin', 'note')),
  replied boolean not null default false,
  -- Meetings: who was there.
  attendees text check (char_length(attendees) <= 300),
  note text check (char_length(note) <= 2000)
);

create index if not exists b2b_activities_deal_idx on course.b2b_activities (deal_id, created_at desc);
create index if not exists b2b_activities_created_idx on course.b2b_activities (created_at desc);

create table if not exists course.b2b_tasks (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  deal_id uuid not null references course.b2b_deals (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  due date,
  assignee_email text,
  done_at timestamptz,
  done_by text,
  created_by text not null
);

create index if not exists b2b_tasks_open_idx on course.b2b_tasks (assignee_email, due) where done_at is null;
create index if not exists b2b_tasks_deal_idx on course.b2b_tasks (deal_id);

create table if not exists course.b2b_stage_history (
  id bigint generated always as identity primary key,
  deal_id uuid not null references course.b2b_deals (id) on delete cascade,
  from_stage text,
  to_stage text not null,
  by_email text not null,
  at timestamptz not null default now()
);

create index if not exists b2b_stage_history_deal_idx on course.b2b_stage_history (deal_id, at);
create index if not exists b2b_stage_history_at_idx on course.b2b_stage_history (at desc);
