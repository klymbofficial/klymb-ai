import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
  PASSWORD_LIMITS,
  changePassword,
  hashPassword,
  needsCurrentPassword,
  passwordProblem,
  signInWithPassword,
  verifyPassword,
  type PasswordStore,
} from "../src/lib/company/password-rules";
import type { LimitRule, Limiter } from "../src/lib/company/signin-code";

/**
 * An in-memory company_passwords that behaves like the SQL in
 * src/lib/company/password-store.ts: a password is found only while its
 * owner is an active member.
 */
function memoryStore(members: string[], initial: Record<string, string> = {}) {
  const active = new Set(members);
  const rows = new Map(Object.entries(initial));
  let broken = false;
  const store: PasswordStore = {
    async find(email) {
      if (broken) return null;
      return { hash: active.has(email) ? (rows.get(email) ?? null) : null };
    },
    async save(email, hash) {
      if (broken) return false;
      rows.set(email, hash);
      return true;
    },
  };
  return { store, rows, active, breakIt: () => { broken = true; } };
}

const allow: Limiter = async () => true;

function countingLimiter(refuse?: (rule: LimitRule, identity?: string) => boolean) {
  const calls: [string, string | undefined][] = [];
  const limit: Limiter = async (rule, identity) => {
    calls.push([rule.action, identity]);
    return !refuse?.(rule, identity);
  };
  return { limit, calls };
}

// ── Hashing ─────────────────────────────────────────────────

test("a hash verifies its own password and nothing else", async () => {
  const hash = await hashPassword("correct horse battery");
  assert.ok(await verifyPassword("correct horse battery", hash));
  assert.ok(!(await verifyPassword("correct horse batter", hash)));
  assert.ok(!(await verifyPassword("", hash)));
});

test("the stored hash never contains the password, and is salted", async () => {
  const a = await hashPassword("s3cret-password");
  const b = await hashPassword("s3cret-password");
  assert.ok(!a.includes("s3cret-password"));
  assert.notEqual(a, b, "two hashes of one password differ by their salt");
  assert.match(a, /^scrypt\$16384\$8\$1\$[A-Za-z0-9+/=]+\$[A-Za-z0-9+/=]+$/);
});

test("the hash's shape is the one the migration's check allows", async () => {
  const migration = readFileSync("db/migrations/0097_company_passwords.sql", "utf8");
  const pattern = migration.match(/password_hash ~ '([^']+)'/)?.[1];
  assert.ok(pattern, "the migration checks the hash's shape");
  // Postgres reads \$ as a literal $, as JavaScript does.
  assert.match(await hashPassword("any password at all"), new RegExp(pattern));
});

test("malformed or tampered hashes never match, and never throw", async () => {
  for (const stored of ["", "plain", "bcrypt$x", "scrypt$16384$8$1$$", "scrypt$99999999$8$1$c2FsdA==$aGFzaA==", "scrypt$abc$8$1$c2FsdA==$aGFzaA=="]) {
    assert.equal(await verifyPassword("whatever", stored), false, stored);
  }
});

test("unicode passwords compare the same however they were typed", async () => {
  const hash = await hashPassword("café au lait");
  assert.ok(await verifyPassword("café au lait", hash));
});

// ── What a new password must be ─────────────────────────────

test("new passwords: long enough, not too long, no edge spaces, not the email", () => {
  const email = "dev@acme.com";
  assert.equal(passwordProblem("a".repeat(MIN_PASSWORD_LENGTH), email), null);
  assert.match(passwordProblem("a".repeat(MIN_PASSWORD_LENGTH - 1), email) ?? "", /at least/);
  assert.match(passwordProblem("a".repeat(MAX_PASSWORD_LENGTH + 1), email) ?? "", /at most/);
  assert.match(passwordProblem(" leading space", email) ?? "", /spaces/);
  assert.match(passwordProblem("Dev@Acme.com", email) ?? "", /email/);
  assert.match(passwordProblem("", email) ?? "", /Enter/);
  assert.match(passwordProblem(null, email) ?? "", /Enter/);
});

// ── Signing in ──────────────────────────────────────────────

test("the right password signs in, with the email canonicalised", async () => {
  const { store } = memoryStore(["dev@acme.com"], { "dev@acme.com": await hashPassword("right password") });
  assert.deepEqual(await signInWithPassword(" Dev@Acme.com ", "right password", { store, limit: allow }), { ok: true, email: "dev@acme.com" });
});

test("a wrong password, no password and not invited all get the same answer", async () => {
  const { store } = memoryStore(["dev@acme.com", "new@acme.com"], { "dev@acme.com": await hashPassword("right password") });
  const wrong = { ok: false, reason: "wrong" };
  assert.deepEqual(await signInWithPassword("dev@acme.com", "wrong password", { store, limit: allow }), wrong);
  assert.deepEqual(await signInWithPassword("new@acme.com", "any password", { store, limit: allow }), wrong);
  assert.deepEqual(await signInWithPassword("stranger@else.com", "any password", { store, limit: allow }), wrong);
});

test("a removed member's password stops working", async () => {
  const s = memoryStore(["dev@acme.com"], { "dev@acme.com": await hashPassword("right password") });
  s.active.delete("dev@acme.com");
  assert.deepEqual(await signInWithPassword("dev@acme.com", "right password", { store: s.store, limit: allow }), { ok: false, reason: "wrong" });
});

test("malformed input is refused before any throttle or lookup", async () => {
  const { store } = memoryStore(["dev@acme.com"]);
  const { limit, calls } = countingLimiter();
  for (const [email, password] of [["not-an-email", "pw"], ["dev@acme.com", ""], ["dev@acme.com", 42], ["dev@acme.com", "x".repeat(MAX_PASSWORD_LENGTH + 1)]]) {
    assert.deepEqual(await signInWithPassword(email, password, { store, limit }), { ok: false, reason: "wrong" });
  }
  assert.equal(calls.length, 0);
});

test("tries are throttled per network and per email, before the password is checked", async () => {
  const { store } = memoryStore(["dev@acme.com"], { "dev@acme.com": await hashPassword("right password") });
  const perEmail = countingLimiter((rule) => rule.action === PASSWORD_LIMITS.signInPerEmail.action);
  assert.deepEqual(await signInWithPassword("dev@acme.com", "right password", { store, limit: perEmail.limit }), { ok: false, reason: "limited" });
  assert.deepEqual(perEmail.calls, [[PASSWORD_LIMITS.signInPerNetwork.action, undefined], [PASSWORD_LIMITS.signInPerEmail.action, "dev@acme.com"]]);

  const perNetwork = countingLimiter((rule) => rule.action === PASSWORD_LIMITS.signInPerNetwork.action);
  assert.deepEqual(await signInWithPassword("dev@acme.com", "right password", { store, limit: perNetwork.limit }), { ok: false, reason: "limited" });
});

test("a store failure refuses sign-in", async () => {
  const s = memoryStore(["dev@acme.com"], { "dev@acme.com": await hashPassword("right password") });
  s.breakIt();
  assert.deepEqual(await signInWithPassword("dev@acme.com", "right password", { store: s.store, limit: allow }), { ok: false, reason: "wrong" });
});

// ── Setting and changing it ─────────────────────────────────

const change = (over: Partial<Parameters<typeof changePassword>[0]>) => ({
  email: "dev@acme.com", signInMethod: "email-code", current: "", next: "brand new pass", confirm: "brand new pass", ...over,
});

test("the current password is asked for only when there is one and this session didn't use a code", () => {
  assert.equal(needsCurrentPassword(false, "password"), false);
  assert.equal(needsCurrentPassword(false, "google"), false);
  assert.equal(needsCurrentPassword(true, "email-code"), false);
  assert.equal(needsCurrentPassword(true, "password"), true);
  assert.equal(needsCurrentPassword(true, "google"), true);
  assert.equal(needsCurrentPassword(true, undefined), true);
});

test("a first password is set without a current one, and then signs in", async () => {
  const s = memoryStore(["dev@acme.com"]);
  assert.deepEqual(await changePassword(change({ signInMethod: "google" }), { store: s.store, limit: allow }), { ok: true });
  assert.deepEqual(await signInWithPassword("dev@acme.com", "brand new pass", { store: s.store, limit: allow }), { ok: true, email: "dev@acme.com" });
});

test("a password session must give the current password to change it", async () => {
  const s = memoryStore(["dev@acme.com"], { "dev@acme.com": await hashPassword("old password") });
  const deps = { store: s.store, limit: allow };
  const before = s.rows.get("dev@acme.com");

  const missing = await changePassword(change({ signInMethod: "password" }), deps);
  assert.deepEqual(missing, { ok: false, field: "current", error: "Enter your current password." });
  const wrong = await changePassword(change({ signInMethod: "password", current: "not it at all" }), deps);
  assert.equal(wrong.ok, false);
  assert.equal(!wrong.ok && wrong.field, "current");
  assert.equal(s.rows.get("dev@acme.com"), before, "nothing saved");

  assert.deepEqual(await changePassword(change({ signInMethod: "password", current: "old password" }), deps), { ok: true });
  assert.ok(await verifyPassword("brand new pass", s.rows.get("dev@acme.com") as string));
  assert.ok(!(await verifyPassword("old password", s.rows.get("dev@acme.com") as string)));
});

test("a code session resets a forgotten password without the current one", async () => {
  const s = memoryStore(["dev@acme.com"], { "dev@acme.com": await hashPassword("forgotten one") });
  assert.deepEqual(await changePassword(change({ signInMethod: "email-code" }), { store: s.store, limit: allow }), { ok: true });
  assert.ok(await verifyPassword("brand new pass", s.rows.get("dev@acme.com") as string));
});

test("current-password guesses in Settings are throttled per email", async () => {
  const s = memoryStore(["dev@acme.com"], { "dev@acme.com": await hashPassword("old password") });
  const { limit, calls } = countingLimiter(() => true);
  const result = await changePassword(change({ signInMethod: "password", current: "old password" }), { store: s.store, limit });
  assert.equal(result.ok, false);
  assert.match(!result.ok ? result.error : "", /Too many attempts/);
  assert.deepEqual(calls, [[PASSWORD_LIMITS.changePerEmail.action, "dev@acme.com"]]);
});

test("a weak or mismatched new password is refused before anything is read", async () => {
  const s = memoryStore(["dev@acme.com"]);
  s.breakIt(); // would be "unavailable" if it were read
  const weak = await changePassword(change({ next: "short", confirm: "short" }), { store: s.store, limit: allow });
  assert.equal(!weak.ok && weak.field, "next");
  const mismatch = await changePassword(change({ confirm: "something else" }), { store: s.store, limit: allow });
  assert.equal(!mismatch.ok && mismatch.field, "confirm");
});

test("a store failure is reported, not a silent success", async () => {
  const s = memoryStore(["dev@acme.com"]);
  s.breakIt();
  const result = await changePassword(change({}), { store: s.store, limit: allow });
  assert.equal(result.ok, false);
  assert.match(!result.ok ? result.error : "", /can't be saved/);
});

// ── Wiring ──────────────────────────────────────────────────

test("the store only finds a password for an active member, and upserts on save", () => {
  const source = readFileSync("src/lib/company/password-store.ts", "utf8");
  assert.match(source, /exists \(select 1 from course\.company_members m where m\.email = p\.email and m\.removed_at is null\)/);
  assert.match(source, /on conflict \(email\) do update set password_hash = excluded\.password_hash, updated_at = now\(\)/);
});

test("the Settings action takes the email and sign-in method from the session, never the form", () => {
  const source = readFileSync("src/app/org/[slug]/(workspace)/settings/actions.ts", "utf8");
  assert.match(source, /email: member\.email/);
  assert.match(source, /signInMethod: session\?\.user\?\.signInMethod/);
  assert.doesNotMatch(source, /formData\.get\("email"\)/);
});
