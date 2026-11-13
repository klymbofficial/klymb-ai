-- ─────────────────────────────────────────────────────────────
--  Sales: leads, every touch on them, and the monthly targets
--
--  course.sales_leads is one person (or, for B2B, one organisation) the team
--  is trying to sell to. Its stage follows the board: rejected, warm,
--  potential, positive, almost, signed, plus 'new' before anyone has spoken
--  to them. A lead is never marked "paid" by hand: the report matches it to
--  course.payments by email, or by phone through the forms they filled in.
--
--  course.sales_touches is one outreach: a WhatsApp, a call, an email, a DM or
--  a comment. `replied` marks a two-way conversation, which is what the
--  1-in-10 conversion assumption is measured against.
--
--  course.sales_targets is one row per month, so the report can show pace.
--
--  Idempotent: safe to run more than once.
-- ─────────────────────────────────────────────────────────────

create table if not exists course.sales_leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text not null check (char_length(name) between 1 and 120),
  -- Digits only, with country code: 919876543210. Null for a lead known only by email.
  phone text check (phone ~ '^[0-9]{8,15}$'),
  email text constraint sales_leads_email_lowercase check (email = lower(email)),
  kind text not null default 'b2c' check (kind in ('b2c', 'b2b')),
  source text not null
    check (source in ('socials','bought','referral','hackathon','webinar','college','b2b','website','other')),
  -- Which hackathon, college, webinar or list it came from.
  source_detail text check (char_length(source_detail) <= 120),
  -- College or company.
  org text check (char_length(org) <= 120),
  stage text not null default 'new'
    check (stage in ('new','rejected','warm','potential','positive','almost','signed')),
  stage_changed_at timestamptz not null default now(),
  signed_at timestamptz,
  owner_email text,
  next_follow_up date,
  notes text check (char_length(notes) <= 2000),
  created_by text,
  check (phone is not null or email is not null)
);

create unique index if not exists sales_leads_phone_key on course.sales_leads (phone) where phone is not null;
create unique index if not exists sales_leads_email_key on course.sales_leads (email) where email is not null;
create index if not exists sales_leads_follow_up_idx on course.sales_leads (owner_email, next_follow_up);
create index if not exists sales_leads_created_idx on course.sales_leads (created_at desc);

create table if not exists course.sales_touches (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  lead_id uuid not null references course.sales_leads (id) on delete cascade,
  by_email text not null,
  channel text not null check (channel in ('whatsapp','call','email','dm','comment','meeting')),
  replied boolean not null default false,
  note text check (char_length(note) <= 1000)
);

create index if not exists sales_touches_created_idx on course.sales_touches (created_at desc);
create index if not exists sales_touches_lead_idx on course.sales_touches (lead_id, created_at desc);

create table if not exists course.sales_targets (
  -- First day of the month.
  month date primary key check (extract(day from month) = 1),
  enrolments integer not null check (enrolments >= 0),
  b2b integer not null default 0 check (b2b >= 0),
  hackathons integer not null default 0 check (hackathons >= 0),
  webinars integer not null default 0 check (webinars >= 0)
);

-- The plan on the board, November 2026 to March 2027.
insert into course.sales_targets (month, enrolments, b2b, hackathons, webinars) values
  ('2026-11-01', 15, 1, 0, 0),
  ('2026-12-01', 25, 2, 1, 1),
  ('2027-01-01', 50, 3, 1, 2),
  ('2027-02-01', 100, 5, 1, 2),
  ('2027-03-01', 200, 8, 1, 2)
on conflict (month) do nothing;
