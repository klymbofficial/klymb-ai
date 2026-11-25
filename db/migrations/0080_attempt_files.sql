-- ─────────────────────────────────────────────────────────────
--  Attempt files: what a candidate attaches to a written_file test
--  (H07b of the hiring plan, H05_PROPOSAL; decision 24 Nov: A)
--
--    attempt_files  one row per file attached to an attempt: its name as
--                   uploaded, its type (read from the file's own bytes,
--                   never its name alone), size, SHA-256, and where it is
--                   kept in private storage. At most 3 per attempt, 4 MB
--                   each, PDF / PNG / JPG / TXT / MD: each file takes one
--                   of three numbered slots, unique per attempt, so a
--                   fourth file can't exist even when uploads race; the
--                   database checks the size and types. The same bytes can't be
--                   attached twice. A file stays a 'draft' (the candidate
--                   can remove it) until the attempt is submitted (H08),
--                   which marks it 'submitted'; a submitted file is never
--                   changed or removed except with its company.
--
--  Adds a table the previous release never reads, so it is safe while that
--  release is live.
--
--  Idempotent: safe to run more than once.
-- ─────────────────────────────────────────────────────────────

create table if not exists course.attempt_files (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references course.companies (id) on delete cascade,
  attempt_id uuid not null references course.candidate_attempts (id) on delete cascade,
  slot smallint not null constraint attempt_files_slot check (slot between 1 and 3),
  name text not null constraint attempt_files_name check (char_length(name) between 1 and 200),
  kind text not null constraint attempt_files_kind check (kind in ('pdf', 'png', 'jpg', 'txt', 'md')),
  bytes integer not null constraint attempt_files_bytes check (bytes between 1 and 4194304),
  sha256 text not null constraint attempt_files_sha256 check (sha256 ~ '^[0-9a-f]{64}$'),
  storage_key text not null constraint attempt_files_storage_key check (char_length(storage_key) <= 300),
  stage text not null default 'draft' constraint attempt_files_stage check (stage in ('draft', 'submitted')),
  added_at timestamptz not null default now(),
  constraint attempt_files_once unique (attempt_id, sha256),
  constraint attempt_files_slot_once unique (attempt_id, slot)
);

create index if not exists attempt_files_attempt_idx on course.attempt_files (attempt_id);

-- A submitted file is evidence: it can't be edited, and only goes with its company or attempt.
create or replace function course.attempt_files_submitted_fixed() returns trigger
language plpgsql as $$
begin
  if tg_op = 'UPDATE' and old.stage = 'submitted' then
    raise exception 'a submitted file cannot be changed' using errcode = 'P0001';
  end if;
  if tg_op = 'UPDATE' and (new.id <> old.id or new.attempt_id <> old.attempt_id or new.slot <> old.slot or new.company_id <> old.company_id
     or new.sha256 <> old.sha256 or new.storage_key <> old.storage_key or new.bytes <> old.bytes or new.kind <> old.kind) then
    raise exception 'a file''s contents cannot be changed' using errcode = 'P0001';
  end if;
  return new;
end
$$;

drop trigger if exists attempt_files_submitted_fixed on course.attempt_files;
create trigger attempt_files_submitted_fixed
  before update on course.attempt_files
  for each row execute function course.attempt_files_submitted_fixed();
