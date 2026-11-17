-- ─────────────────────────────────────────────────────────────
--  Live chat: "Talk to our team" in the Kamran support bot
--
--  A visitor starts a chat from the bot and gets a secret token kept in their
--  browser; only its hash is stored here. Messages go to /admin/chat, which
--  only the live-chat owner can open, and are pushed to that owner's phone.
--  Replies come back into the bot, or by email if the visitor has left.
--
--  Idempotent: safe to run more than once.
-- ─────────────────────────────────────────────────────────────

create table if not exists course.chat_threads (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  email text not null
    constraint chat_threads_email_lowercase check (email = lower(email)),
  name text check (name is null or length(name) <= 80),
  anon_id text check (anon_id is null or length(anon_id) <= 64),
  page text check (page is null or length(page) <= 200),
  context jsonb not null default '{}'::jsonb,
  status text not null default 'open' check (status in ('open', 'done')),
  created_at timestamptz not null default now(),
  last_visitor_at timestamptz,
  last_admin_at timestamptz,
  visitor_seen_at timestamptz,
  admin_seen_at timestamptz,
  emailed_at timestamptz
);

create index if not exists chat_threads_recent on course.chat_threads (coalesce(last_visitor_at, created_at) desc);
create index if not exists chat_threads_email on course.chat_threads (email);

create table if not exists course.chat_messages (
  id bigint generated always as identity primary key,
  thread_id uuid not null references course.chat_threads (id) on delete cascade,
  sender text not null check (sender in ('visitor', 'team')),
  body text not null check (length(body) between 1 and 2000),
  page text check (page is null or length(page) <= 200),
  created_at timestamptz not null default now()
);

create index if not exists chat_messages_thread on course.chat_messages (thread_id, id);

-- The live-chat owner's devices, for a notification on every visitor message.
create table if not exists course.chat_push_subscriptions (
  endpoint text primary key,
  email text not null
    constraint chat_push_email_lowercase check (email = lower(email)),
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);
