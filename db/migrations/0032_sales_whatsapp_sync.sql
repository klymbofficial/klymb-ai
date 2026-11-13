-- ─────────────────────────────────────────────────────────────
--  Sales: WhatsApp dashboard messages become touches
--
--  The WhatsApp dashboard (a Cloudflare Worker with its own D1 database)
--  sends the campaigns and holds the inbox. A sync reads its messages and
--  writes them here: each message we sent is an outreach touch, and each
--  message they sent us is an `inbound` touch, which marks a conversation
--  but is not counted as outreach.
--
--  external_id ('wa:<message id>') makes the sync safe to run again.
--  course.sales_sync_state remembers how far it has read.
--
--  Idempotent: safe to run more than once.
-- ─────────────────────────────────────────────────────────────

alter table course.sales_touches add column if not exists inbound boolean not null default false;
alter table course.sales_touches add column if not exists external_id text;

create unique index if not exists sales_touches_external_key
  on course.sales_touches (external_id) where external_id is not null;

create table if not exists course.sales_sync_state (
  source text primary key,
  -- The last message read, as (updated_at, id) in the dashboard's database.
  cursor_at text not null default '',
  cursor_id bigint not null default 0,
  synced_at timestamptz,
  last_error text
);

insert into course.sales_sync_state (source) values ('whatsapp') on conflict (source) do nothing;
