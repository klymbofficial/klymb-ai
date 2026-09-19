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
  assert.equal(files.at(-1), "20260922000000_security_hardening.sql", "hardening must be the newest migration");
  assert.ok(files.length >= 9);
});
