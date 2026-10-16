-- ─────────────────────────────────────────────────────────────
--  Admin audit log: who did what, when
--
--  Append-only: a trigger refuses every UPDATE and DELETE, even from the
--  service role, so an entry can't be quietly edited or removed afterwards.
--  RLS on with no policies: only the server writes and reads it.
--  Additive and safe to run more than once.
-- ─────────────────────────────────────────────────────────────

create table if not exists public.admin_audit_log (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  admin_email text not null,
  action text not null,
  target text,
  details jsonb not null default '{}'::jsonb
);

create index if not exists admin_audit_log_at on public.admin_audit_log (at desc);
alter table public.admin_audit_log enable row level security;

create or replace function public.admin_audit_log_append_only()
returns trigger language plpgsql as $$
begin
  raise exception 'admin_audit_log is append-only';
end;
$$;

drop trigger if exists admin_audit_log_no_change on public.admin_audit_log;
create trigger admin_audit_log_no_change
  before update or delete on public.admin_audit_log
  for each row execute function public.admin_audit_log_append_only();
