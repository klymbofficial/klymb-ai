import { strict as assert } from "node:assert";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";
import {
  CODE_TTL_MINUTES,
  LIMITS,
  MAX_CODE_ATTEMPTS,
  generateCode,
  hashCode,
  normaliseCode,
  redeemCode,
  requestCode,
  sameHash,
  type CodeStore,
  type LimitRule,
  type Limiter,
} from "../src/lib/company/signin-code";

const SECRET = "test-secret";

/**
 * An in-memory company_signin_codes that behaves like the SQL in
 * src/lib/company/signin-store.ts: upsert resets tries, a try is counted
 * only on an unexpired code under the limit, and use deletes the row.
 */
function memoryStore(members: string[]) {
  const invited = new Set(members);
  const rows = new Map<string, { hash: string; expiresAt: Date; attempts: number }>();
  const store: CodeStore = {
    async isMember(email) { return invited.has(email); },
    async save(email, hash, expiresAt) {
      if (!invited.has(email)) return false; // the foreign key
      rows.set(email, { hash, expiresAt, attempts: 0 });
      return true;
    },
    async takeAttempt(email, max, now) {
      const row = rows.get(email);
      if (!row || row.attempts >= max || row.expiresAt <= now) return null;
      row.attempts += 1;
      return row.hash;
    },
    async consume(email, hash) {
      const row = rows.get(email);
      if (!row || row.hash !== hash) return false;
      rows.delete(email);
      return true;
    },
  };
  const remove = (email: string) => { invited.delete(email); rows.delete(email); }; // on delete cascade
  return { store, rows, remove };
}

/** Captures sent codes instead of emailing them. */
function outbox() {
  const sent: { email: string; code: string }[] = [];
  return { sent, send: async (email: string, code: string) => { sent.push({ email, code }); }, last: () => sent.at(-1)?.code ?? "" };
}

const allowAll: Limiter = async () => true;

function setup(members = ["dev@acme.com", "hr@acme.com"]) {
  const db = memoryStore(members);
  const mail = outbox();
  let clock = new Date("2026-10-31T10:00:00Z");
  const now = () => clock;
  const advance = (minutes: number) => { clock = new Date(clock.getTime() + minutes * 60_000); };
  const request = (email: unknown, limit = allowAll) => requestCode(email, { store: db.store, limit, send: mail.send, secret: SECRET, now });
  const redeem = (email: unknown, code: unknown, limit = allowAll) => redeemCode(email, code, { store: db.store, limit, secret: SECRET, now });
  return { db, mail, request, redeem, advance };
}

// ── The code ────────────────────────────────────────────────

test("codes are six digits, leading zeros kept, and spread across the range", () => {
  const codes = Array.from({ length: 2000 }, generateCode);
  for (const c of codes) assert.match(c, /^\d{6}$/);
  assert.ok(new Set(codes).size > 1990, "codes repeat far too often");
});

test("typed codes may have spaces or a dash; anything else is refused", () => {
  assert.equal(normaliseCode("123456"), "123456");
  assert.equal(normaliseCode(" 123 456 "), "123456");
  assert.equal(normaliseCode("123-456"), "123456");
  for (const bad of ["12345", "1234567", "12345a", "", "１２３４５６", null, undefined, 123456]) assert.equal(normaliseCode(bad), null, String(bad));
});

test("the stored hash never contains the code, and depends on the email and the secret", () => {
  const hash = hashCode("dev@acme.com", "123456", SECRET);
  assert.match(hash, /^[0-9a-f]{64}$/);
  assert.ok(!hash.includes("123456"));
  assert.equal(hash, hashCode("dev@acme.com", "123456", SECRET));
  assert.notEqual(hash, hashCode("hr@acme.com", "123456", SECRET));
  assert.notEqual(hash, hashCode("dev@acme.com", "123456", "other-secret"));
  assert.notEqual(hash, hashCode("dev@acme.com", "123457", SECRET));
});

test("hash comparison refuses mismatched, empty and odd-length values", () => {
  const h = hashCode("dev@acme.com", "123456", SECRET);
  assert.equal(sameHash(h, h), true);
  assert.equal(sameHash(h, hashCode("dev@acme.com", "654321", SECRET)), false);
  assert.equal(sameHash("", ""), false);
  assert.equal(sameHash(h, h.slice(0, 10)), false);
});

// ── Asking for a code: invited people only ──────────────────

test("an invited member gets a code, and only its hash is stored", async () => {
  const { db, mail, request } = setup();
  assert.deepEqual(await request(" Dev@Acme.com "), { status: "sent", email: "dev@acme.com" });
  assert.equal(mail.sent.length, 1);
  assert.equal(mail.sent[0].email, "dev@acme.com");
  const row = db.rows.get("dev@acme.com")!;
  assert.notEqual(row.hash, mail.last());
  assert.equal(row.hash, hashCode("dev@acme.com", mail.last(), SECRET));
});

test("someone not invited gets the same answer, and nothing is stored or sent", async () => {
  const { db, mail, request } = setup();
  assert.deepEqual(await request("stranger@acme.com"), { status: "sent", email: "stranger@acme.com" });
  assert.equal(mail.sent.length, 0);
  assert.equal(db.rows.size, 0);
});

test("a malformed email is refused before anything else happens", async () => {
  const { mail, request } = setup();
  let limited = false;
  for (const bad of ["", "nope", null, 42]) {
    assert.deepEqual(await request(bad, async () => { limited = true; return true; }), { status: "invalid" });
  }
  assert.equal(limited, false);
  assert.equal(mail.sent.length, 0);
});

test("the code expires after 10 minutes", async () => {
  assert.equal(CODE_TTL_MINUTES, 10);
  const { mail, request, redeem, advance } = setup();
  await request("dev@acme.com");
  advance(10);
  assert.deepEqual(await redeem("dev@acme.com", mail.last()), { ok: false, reason: "wrong" });
});

test("a code just inside the 10 minutes still works", async () => {
  const { mail, request, redeem, advance } = setup();
  await request("dev@acme.com");
  advance(9.9);
  assert.deepEqual(await redeem("dev@acme.com", mail.last()), { ok: true, email: "dev@acme.com" });
});

test("asking again replaces the old code", async () => {
  const { mail, request, redeem } = setup();
  await request("dev@acme.com");
  const first = mail.last();
  await request("dev@acme.com");
  const second = mail.last();
  if (first !== second) assert.deepEqual(await redeem("dev@acme.com", first), { ok: false, reason: "wrong" });
  assert.deepEqual(await redeem("dev@acme.com", second), { ok: true, email: "dev@acme.com" });
});

test("without a server secret no code is issued", async () => {
  const { db, mail } = setup();
  const result = await requestCode("dev@acme.com", { store: db.store, limit: allowAll, send: mail.send, secret: undefined });
  assert.deepEqual(result, { status: "unavailable" });
  assert.equal(mail.sent.length, 0);
});

test("a store failure is 'unavailable', not a silent success", async () => {
  const { mail } = setup();
  const broken: CodeStore = { isMember: async () => null, save: async () => false, takeAttempt: async () => null, consume: async () => false };
  assert.deepEqual(await requestCode("dev@acme.com", { store: broken, limit: allowAll, send: mail.send, secret: SECRET }), { status: "unavailable" });
  const saveFails: CodeStore = { ...broken, isMember: async () => true };
  assert.deepEqual(await requestCode("dev@acme.com", { store: saveFails, limit: allowAll, send: mail.send, secret: SECRET }), { status: "unavailable" });
  assert.equal(mail.sent.length, 0);
});

// ── Entering the code ───────────────────────────────────────

test("the right code signs in once, and only once", async () => {
  const { mail, request, redeem } = setup();
  await request("dev@acme.com");
  const code = mail.last();
  assert.deepEqual(await redeem("dev@acme.com", code), { ok: true, email: "dev@acme.com" });
  assert.deepEqual(await redeem("dev@acme.com", code), { ok: false, reason: "wrong" });
});

test("the code may be typed with spaces and capitals in the email", async () => {
  const { mail, request, redeem } = setup();
  await request("dev@acme.com");
  const c = mail.last();
  assert.deepEqual(await redeem(" DEV@acme.com", `${c.slice(0, 3)} ${c.slice(3)}`), { ok: true, email: "dev@acme.com" });
});

test(`after ${MAX_CODE_ATTEMPTS} wrong tries even the right code stops working`, async () => {
  assert.equal(MAX_CODE_ATTEMPTS, 5);
  const { mail, request, redeem } = setup();
  await request("dev@acme.com");
  const right = mail.last();
  const wrong = right === "000000" ? "111111" : "000000";
  for (let i = 0; i < MAX_CODE_ATTEMPTS; i += 1) assert.deepEqual(await redeem("dev@acme.com", wrong), { ok: false, reason: "wrong" });
  assert.deepEqual(await redeem("dev@acme.com", right), { ok: false, reason: "wrong" });
});

test("the right code on the last allowed try still works", async () => {
  const { mail, request, redeem } = setup();
  await request("dev@acme.com");
  const right = mail.last();
  const wrong = right === "000000" ? "111111" : "000000";
  for (let i = 0; i < MAX_CODE_ATTEMPTS - 1; i += 1) await redeem("dev@acme.com", wrong);
  assert.deepEqual(await redeem("dev@acme.com", right), { ok: true, email: "dev@acme.com" });
});

test("a new code resets the tries", async () => {
  const { mail, request, redeem } = setup();
  await request("dev@acme.com");
  for (let i = 0; i < MAX_CODE_ATTEMPTS; i += 1) await redeem("dev@acme.com", "000000");
  await request("dev@acme.com");
  assert.deepEqual(await redeem("dev@acme.com", mail.last()), { ok: true, email: "dev@acme.com" });
});

test("malformed codes don't use up a try", async () => {
  const { mail, request, redeem, db } = setup();
  await request("dev@acme.com");
  for (const bad of ["", "abc", "12345", null]) await redeem("dev@acme.com", bad);
  assert.equal(db.rows.get("dev@acme.com")!.attempts, 0);
  assert.deepEqual(await redeem("dev@acme.com", mail.last()), { ok: true, email: "dev@acme.com" });
});

test("one member's code never signs in another", async () => {
  const { mail, request, redeem } = setup();
  await request("dev@acme.com");
  assert.deepEqual(await redeem("hr@acme.com", mail.last()), { ok: false, reason: "wrong" });
  assert.deepEqual(await redeem("stranger@acme.com", mail.last()), { ok: false, reason: "wrong" });
});

test("a removed member's code dies with them", async () => {
  const { mail, request, redeem, db } = setup();
  await request("dev@acme.com");
  db.remove("dev@acme.com");
  assert.deepEqual(await redeem("dev@acme.com", mail.last()), { ok: false, reason: "wrong" });
});

test("a code checked with a different secret is refused", async () => {
  const { db, mail, request } = setup();
  await request("dev@acme.com");
  assert.deepEqual(await redeemCode("dev@acme.com", mail.last(), { store: db.store, limit: allowAll, secret: "rotated" }), { ok: false, reason: "wrong" });
});

test("if two requests use the same right code at once, only one signs in", async () => {
  const { mail, request, redeem } = setup();
  await request("dev@acme.com");
  const code = mail.last();
  const results = await Promise.all([redeem("dev@acme.com", code), redeem("dev@acme.com", code)]);
  assert.equal(results.filter((r) => r.ok).length, 1);
});

// ── Rate limits ─────────────────────────────────────────────

/** A limiter that allows `n` calls per rule+identity, recording what it was asked. */
function countingLimiter(n: number) {
  const counts = new Map<string, number>();
  const asked: { action: string; identity?: string }[] = [];
  const limit = async (rule: LimitRule, identity?: string) => {
    asked.push({ action: rule.action, identity });
    const key = `${rule.action}|${identity ?? "network"}`;
    const used = (counts.get(key) ?? 0) + 1;
    counts.set(key, used);
    return used <= Math.min(n, rule.limit);
  };
  return { limit, asked };
}

test("the limits are the agreed ones", () => {
  assert.deepEqual(LIMITS.requestPerEmail, { action: "company-code-request-email", limit: 3, windowMinutes: 15 });
  assert.deepEqual(LIMITS.requestPerNetwork, { action: "company-code-request", limit: 10, windowMinutes: 15 });
  assert.deepEqual(LIMITS.verifyPerNetwork, { action: "company-code-verify", limit: 20, windowMinutes: 15 });
});

test("asking for codes is limited per email (3) and per network", async () => {
  const { mail, request } = setup();
  const limiter = countingLimiter(Infinity);
  for (let i = 0; i < 3; i += 1) assert.equal((await request("dev@acme.com", limiter.limit)).status, "sent");
  assert.deepEqual(await request("dev@acme.com", limiter.limit), { status: "limited" });
  assert.equal(mail.sent.length, 3);
  assert.ok(limiter.asked.some((a) => a.action === "company-code-request" && a.identity === undefined));
  assert.ok(limiter.asked.some((a) => a.action === "company-code-request-email" && a.identity === "dev@acme.com"));
});

test("a limited request stores and sends nothing, invited or not", async () => {
  const { db, mail, request } = setup();
  const deny = async () => false;
  assert.deepEqual(await request("dev@acme.com", deny), { status: "limited" });
  assert.deepEqual(await request("stranger@acme.com", deny), { status: "limited" });
  assert.equal(mail.sent.length, 0);
  assert.equal(db.rows.size, 0);
});

test("non-invited emails count against the limit too, so the limit reveals nothing", async () => {
  const { request } = setup();
  const limiter = countingLimiter(Infinity);
  for (let i = 0; i < 3; i += 1) await request("stranger@acme.com", limiter.limit);
  assert.deepEqual(await request("stranger@acme.com", limiter.limit), { status: "limited" });
});

test("entering codes is limited per network, and a limited try doesn't use up the code", async () => {
  const { db, mail, request, redeem } = setup();
  await request("dev@acme.com");
  assert.deepEqual(await redeem("dev@acme.com", mail.last(), async () => false), { ok: false, reason: "limited" });
  assert.equal(db.rows.get("dev@acme.com")!.attempts, 0);
  assert.deepEqual(await redeem("dev@acme.com", mail.last()), { ok: true, email: "dev@acme.com" });
});

test("guessing across many emails from one network hits the limit", async () => {
  const { redeem } = setup();
  const limiter = countingLimiter(Infinity);
  const results = [];
  for (let i = 0; i < 25; i += 1) results.push(await redeem(`user${i}@acme.com`, "123456", limiter.limit));
  assert.equal(results.filter((r) => !r.ok && r.reason === "limited").length, 5);
});

// ── The schema and the wiring ───────────────────────────────

const migration = readFileSync("db/migrations/0011_company_signin_codes.sql", "utf8");
const storeSource = readFileSync("src/lib/company/signin-store.ts", "utf8");
const authSource = readFileSync("src/auth.ts", "utf8");

test("codes belong to invited members and die with them", () => {
  assert.match(migration, /create table if not exists course\.company_signin_codes \(\s*email text primary key\s*references course\.company_members \(email\) on delete cascade/);
});

test("the table holds a hash, never a code column", () => {
  assert.match(migration, /code_hash text not null/);
  assert.match(migration, /check \(code_hash ~ '\^\[0-9a-f\]\{64\}\$'\)/);
  assert.doesNotMatch(migration.replace(/--.*$/gm, ""), /\bcode text\b/);
});

test("a try is counted and checked in one statement", () => {
  assert.match(storeSource, /set attempts = attempts \+ 1\s+where email = \$\{email\} and attempts < \$\{maxAttempts\} and expires_at > /);
  assert.match(storeSource, /delete from course\.company_signin_codes where email = \$\{email\} and code_hash = \$\{hash\}/);
});

test("no company can take the sign-in page's slug", () => {
  // The page lives at /org/sign-in, so a company with that slug would be unreachable.
  assert.ok(existsSync("src/app/org/sign-in/page.tsx"), "the sign-in page has moved: update the reserved slug");
  assert.match(migration, /add constraint companies_slug_reserved check \(slug <> 'sign-in'\)/);
  // Added only if missing, so the migration stays safe to run twice.
  assert.match(migration, /if not exists \(select 1 from pg_constraint where conname = 'companies_slug_reserved'\)/);
});

test("the limits are enforced inside the sign-in provider, not only on the form", () => {
  // /api/auth/callback/email-code can be posted to directly, skipping the page.
  assert.match(authSource, /id: "email-code"/);
  assert.match(authSource, /redeemSignInCode\(credentials\.email, credentials\.code\)/);
});
