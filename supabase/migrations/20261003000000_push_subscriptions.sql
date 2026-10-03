-- ─────────────────────────────────────────────────────────────
--  Push notifications: one row per device a learner allowed reminders on.
--  Written and read by the service role only. Additive, safe to re-run.
-- ─────────────────────────────────────────────────────────────

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  learner_id uuid not null references public.learners(id) on delete cascade,
  endpoint text not null unique check (char_length(endpoint) <= 1000),
  p256dh text not null check (char_length(p256dh) <= 200),
  auth text not null check (char_length(auth) <= 100)
);

create index if not exists push_subscriptions_learner_idx on public.push_subscriptions (learner_id);

alter table public.push_subscriptions enable row level security;
revoke all on public.push_subscriptions from anon, authenticated;
