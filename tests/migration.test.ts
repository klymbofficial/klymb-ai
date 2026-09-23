import { strict as assert } from "node:assert";
import { test } from "node:test";
import { readFileSync, readdirSync } from "node:fs";

const dir = "supabase/migrations";
const hardening = readFileSync(`${dir}/20260922000000_security_hardening.sql`, "utf8");

test("revokes the enrolment RPC from anonymous and signed-in roles", () => {
  assert.match(hardening, /revoke all on function public\.enrol_open_track\(text\) from anon;/);
  assert.match(hardening, /revoke all on function public\.enrol_open_track\(text\) from authenticated;/);
  assert.match(hardening, /grant execute on function public\.enrol_open_track\(text\) to service_role;/);
});

test("removes public write access to registrations", () => {
  assert.match(hardening, /revoke insert, update, delete on public\.registrations from anon;/);
  assert.match(hardening, /drop policy if exists "Public can register" on public\.registrations;/);
});

test("keeps row level security on for the new table", () => {
  assert.match(hardening, /alter table public\.rate_limit_events enable row level security;/);
  assert.match(hardening, /revoke all on public\.rate_limit_events from anon, authenticated;/);
});

test("email constraints are added NOT VALID so the migration cannot fail on legacy rows", () => {
  for (const table of ["registrations", "learners", "admin_users"]) {
    assert.match(hardening, new RegExp(`${table}_email_lowercase check \\(email = lower\\(email\\)\\) not valid`));
  }
});

test("earlier migrations are untouched additions, not rewrites", () => {
  const files = readdirSync(dir).sort();

  // Every migration that has already been applied must still be present and
  // still be named the same. New work is a new file; nothing here is edited.
  const applied = [
    "20260915000000_create_registrations.sql",
    "20260916000000_registrations_prod_hardening.sql",
    "20260917000000_admin_and_progress.sql",
    "20260918000000_self_serve_enrolment.sql",
    "20260919000000_enrolment_fix.sql",
    "20260919010000_learner_claim_policy.sql",
    "20260920000000_quiz_answers.sql",
    "20260921000000_evidence_identity.sql",
    "20260922000000_security_hardening.sql",
  ];
  for (const name of applied) assert.ok(files.includes(name), `${name} is missing`);

  // Timestamps order the run, so they must be unique and sorted.
  const stamps = files.map((f) => f.slice(0, 14));
  assert.equal(new Set(stamps).size, stamps.length, "two migrations share a timestamp");
  assert.deepEqual([...stamps].sort(), stamps);
});

test("the rate limiter counts and records atomically, and only the server may call it", () => {
  const sql = readFileSync(`${dir}/20260924000000_atomic_rate_limit.sql`, "utf8");
  // Without the lock, simultaneous requests all count the same number and all pass.
  assert.match(sql, /pg_advisory_xact_lock\(/);
  assert.ok(sql.indexOf("pg_advisory_xact_lock") < sql.indexOf("select count(*)"), "lock must be taken before counting");
  assert.ok(sql.indexOf("select count(*)") < sql.indexOf("insert into public.rate_limit_events"), "count, then record, inside the lock");
  for (const role of ["public", "anon", "authenticated"]) {
    assert.match(sql, new RegExp(`revoke all on function public\\.rate_limit_hit\\([^)]*\\) from ${role};`));
  }
  assert.match(sql, /grant execute on function public\.rate_limit_hit\([^)]*\) to service_role;/);
});
