-- ─────────────────────────────────────────────────────────────
--  LinkedIn: a learner's permission to post on their behalf
--
--  One row per learner who connected LinkedIn, so finishing a lesson can
--  publish its image and text with one tap instead of a share sheet and a
--  paste. Keyed by the Google-verified email, the identity everything else
--  authorises against; a learner who is not signed in never gets a row.
--
--  The access token and the member URN are sealed in `secret` (AES-256-GCM,
--  key derived from AUTH_SECRET, bound to the email: src/lib/linkedin/oauth.ts).
--  A copy of this table is no use without the key, and a row moved to another
--  learner's email no longer opens. Nothing else LinkedIn returns is kept: no
--  email, no photo, no refresh token (LinkedIn issues those to approved
--  partners only, so the learner reconnects after 60 days).
--
--  Disconnecting deletes the row. Expired rows are deleted by maintenance(),
--  so a learner who never comes back leaves nothing behind.
--
--  Idempotent: safe to run more than once.
-- ─────────────────────────────────────────────────────────────

create table if not exists course.linkedin_connections (
  email text primary key
    constraint linkedin_connections_email_lowercase check (email = lower(email)),
  secret text not null,
  -- What the learner granted, as LinkedIn reported it. Posting needs w_member_social.
  scope text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists linkedin_connections_expires on course.linkedin_connections (expires_at);

-- The application role reaches the table through the default privileges set
-- in 0002_grants.sql, so there is nothing to grant here.

-- maintenance() as 0005_scale.sql left it, plus deleting expired connections.
create or replace function course.maintenance(
  p_batch integer default 10000,
  p_keep_sd_months integer default 3
)
returns table (task text, result bigint)
language plpgsql
security invoker
set search_path = course, pg_temp
as $$
declare
  n bigint;
begin
  -- Rate-limit attempts are deleted rather than partitioned: the table is
  -- small by design and the window any caller asks for is at most a day.
  with doomed as (
    select id from course.rate_limit_events
     where created_at < now() - interval '1 day'
     limit greatest(p_batch, 1)
  )
  delete from course.rate_limit_events r using doomed d where r.id = d.id;
  get diagnostics n = row_count;
  task := 'rate_limit_events deleted'; result := n; return next;

  task := 'sd partitions created'; result := course.ensure_sd_partitions(2); return next;
  task := 'sd partitions dropped'; result := course.drop_old_sd_partitions(p_keep_sd_months); return next;

  -- An expired token can post nothing; keeping it would only keep a secret.
  delete from course.linkedin_connections where expires_at < now();
  get diagnostics n = row_count;
  task := 'linkedin connections expired'; result := n; return next;
end;
$$;
