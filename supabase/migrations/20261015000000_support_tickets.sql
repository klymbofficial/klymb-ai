-- ─────────────────────────────────────────────────────────────
--  Support tickets from Kamran's "Ask the team" form
--
--  Written only by the server (service role); RLS on with no policies,
--  so the browser can never read or write it. Additive, safe to re-run.
-- ─────────────────────────────────────────────────────────────

create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  email text not null,
  name text,
  message text not null,
  page text,
  context jsonb not null default '{}'::jsonb,
  status text not null default 'open' check (status in ('open', 'resolved')),
  resolved_at timestamptz
);

create index if not exists support_tickets_status_created on public.support_tickets (status, created_at desc);
alter table public.support_tickets enable row level security;
