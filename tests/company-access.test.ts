import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  belongsTo,
  canSee,
  canSeeTeam,
  hasRole,
  resolveMember,
  scopeFor,
  type CompanyMember,
  type MemberRow,
  type Subject,
} from "../src/lib/company/access";

/**
 * Two companies that must never see each other's data. Every test below is
 * someone trying to reach a row they shouldn't.
 */
const ACME = { id: "acme-id", slug: "acme", name: "Acme" };
const GLOBEX = { id: "globex-id", slug: "globex", name: "Globex" };

const row = (email: string, company: typeof ACME, role: string, team_id: string | null): MemberRow => ({
  email, role, team_id, company_id: company.id, company_slug: company.slug, company_name: company.name,
});

const table: MemberRow[] = [
  row("hr@acme.com", ACME, "hr", null),
  row("eng-head@acme.com", ACME, "head", "acme-eng"),
  row("dev@acme.com", ACME, "employee", "acme-eng"),
  row("seller@acme.com", ACME, "employee", "acme-sales"),
  row("hr@globex.com", GLOBEX, "hr", null),
  row("dev@globex.com", GLOBEX, "employee", "globex-eng"),
];
const lookup = async (email: string) => table.find((r) => r.email === email) ?? null;
const member = async (email: string) => {
  const m = await resolveMember(email, lookup);
  assert.ok(m, `${email} should be a member`);
  return m;
};

const subject = (email: string): Subject => {
  const r = table.find((x) => x.email === email)!;
  return { companyId: r.company_id, teamId: r.team_id, email: r.email };
};

// ── Who is a member ─────────────────────────────────────────

test("a member's company and role come from their row, with the email canonicalised", async () => {
  assert.deepEqual(await resolveMember("  HR@Acme.COM ", lookup), {
    email: "hr@acme.com", role: "hr", teamId: null, companyId: ACME.id, companySlug: "acme", companyName: "Acme",
  });
});

test("an email with no row is nobody, whatever its domain says", async () => {
  assert.equal(await resolveMember("ceo@acme.com", lookup), null);
  assert.equal(await resolveMember("someone@gmail.com", lookup), null);
});

test("no session (unverified emails arrive as null) is nobody, and the table isn't asked", async () => {
  let asked = false;
  const spy = async () => { asked = true; return table[0]; };
  assert.equal(await resolveMember(null, spy), null);
  assert.equal(await resolveMember(undefined, spy), null);
  assert.equal(await resolveMember("not-an-email", spy), null);
  assert.equal(asked, false);
});

test("a removed member (row deleted) loses access straight away", async () => {
  const shrinking = [...table];
  const live = async (email: string) => shrinking.find((r) => r.email === email) ?? null;
  assert.ok(await resolveMember("dev@acme.com", live));
  shrinking.splice(shrinking.findIndex((r) => r.email === "dev@acme.com"), 1);
  assert.equal(await resolveMember("dev@acme.com", live), null);
});

test("a lookup that returns someone else's row is refused", async () => {
  // e.g. a wildcard match: dev_acme.com against dev@acme.com's row.
  assert.equal(await resolveMember("hr@globex.com", async () => table[0]), null);
});

test("a database error (lookup gives nothing) means no access, not open access", async () => {
  assert.equal(await resolveMember("hr@acme.com", async () => null), null);
});

test("an unknown role grants nothing", async () => {
  for (const role of ["admin", "owner", "HR", "", "hr "]) {
    assert.equal(await resolveMember("x@acme.com", async () => row("x@acme.com", ACME, role, "acme-eng")), null, role);
  }
});

test("a head with no team grants nothing, rather than every team", async () => {
  assert.equal(await resolveMember("x@acme.com", async () => row("x@acme.com", ACME, "head", null)), null);
});

// ── The company in the URL ──────────────────────────────────

test("a member may open their own company's pages", async () => {
  assert.equal(belongsTo(await member("dev@acme.com"), "acme"), true);
  assert.equal(belongsTo(await member("dev@acme.com"), "ACME"), true);
});

test("changing the slug in the URL never opens another company", async () => {
  for (const email of ["hr@acme.com", "eng-head@acme.com", "dev@acme.com"]) {
    const m = await member(email);
    assert.equal(belongsTo(m, "globex"), false, email);
  }
  assert.equal(belongsTo(await member("hr@globex.com"), "acme"), false);
});

test("odd slugs never match", async () => {
  const m = await member("hr@acme.com");
  for (const slug of ["", " acme", "acme/", "acme%00", "acm", null, undefined, ["acme"]]) {
    assert.equal(belongsTo(m, slug), false, String(slug));
  }
  assert.equal(belongsTo(null, "acme"), false);
});

test("role-only pages turn away the other roles", async () => {
  assert.equal(hasRole(await member("hr@acme.com"), ["hr"]), true);
  assert.equal(hasRole(await member("eng-head@acme.com"), ["hr"]), false);
  assert.equal(hasRole(await member("dev@acme.com"), ["hr", "head"]), false);
  assert.equal(hasRole(null, ["hr", "head", "employee"]), false);
});

// ── Whose data a member may see ─────────────────────────────

test("HR sees everyone in their company and no one in another", async () => {
  const hr = await member("hr@acme.com");
  for (const email of ["eng-head@acme.com", "dev@acme.com", "seller@acme.com"]) assert.equal(canSee(hr, subject(email)), true, email);
  for (const email of ["hr@globex.com", "dev@globex.com"]) assert.equal(canSee(hr, subject(email)), false, email);
});

test("a head sees their own team only", async () => {
  const head = await member("eng-head@acme.com");
  assert.equal(canSee(head, subject("dev@acme.com")), true);
  assert.equal(canSee(head, subject("seller@acme.com")), false);
  assert.equal(canSee(head, subject("hr@acme.com")), false);
  assert.equal(canSee(head, subject("dev@globex.com")), false);
});

test("an employee sees only themselves, not teammates, HR or another company", async () => {
  const dev = await member("dev@acme.com");
  assert.equal(canSee(dev, subject("dev@acme.com")), true);
  for (const email of ["eng-head@acme.com", "hr@acme.com", "seller@acme.com", "dev@globex.com"]) {
    assert.equal(canSee(dev, subject(email)), false, email);
  }
});

test("a row with the same email or team id but another company is still refused", async () => {
  // Ids from one company reused against another must not match.
  const head = await member("eng-head@acme.com");
  assert.equal(canSee(head, { companyId: GLOBEX.id, teamId: "acme-eng", email: "dev@acme.com" }), false);
  const dev = await member("dev@acme.com");
  assert.equal(canSee(dev, { companyId: GLOBEX.id, teamId: null, email: "dev@acme.com" }), false);
});

test("nobody signed in sees nothing", () => {
  assert.equal(canSee(null, subject("dev@acme.com")), false);
  assert.equal(canSeeTeam(null, { companyId: ACME.id, teamId: "acme-eng" }), false);
});

test("team pages: HR any team in their company, a head their own, employees none", async () => {
  const eng = { companyId: ACME.id, teamId: "acme-eng" };
  const sales = { companyId: ACME.id, teamId: "acme-sales" };
  const globexEng = { companyId: GLOBEX.id, teamId: "globex-eng" };
  const hr = await member("hr@acme.com");
  assert.deepEqual([canSeeTeam(hr, eng), canSeeTeam(hr, sales), canSeeTeam(hr, globexEng)], [true, true, false]);
  const head = await member("eng-head@acme.com");
  assert.deepEqual([canSeeTeam(head, eng), canSeeTeam(head, sales), canSeeTeam(head, globexEng)], [true, false, false]);
  assert.equal(canSeeTeam(await member("dev@acme.com"), eng), false);
});

// ── The filter data queries apply ───────────────────────────

test("every query scope is pinned to the member's own company", async () => {
  for (const r of table) assert.equal(scopeFor(await member(r.email)).companyId, r.company_id, r.email);
});

test("query scopes narrow a head to their team and an employee to themselves", async () => {
  assert.deepEqual(scopeFor(await member("hr@acme.com")), { companyId: ACME.id, teamId: null, email: null });
  assert.deepEqual(scopeFor(await member("eng-head@acme.com")), { companyId: ACME.id, teamId: "acme-eng", email: null });
  assert.deepEqual(scopeFor(await member("dev@acme.com")), { companyId: ACME.id, teamId: null, email: "dev@acme.com" });
});

test("a scope only ever matches rows the member may see", async () => {
  // The same filter a query applies, run over every row against every member.
  const matches = (m: CompanyMember, s: Subject) => {
    const scope = scopeFor(m);
    return s.companyId === scope.companyId
      && (scope.teamId === null || s.teamId === scope.teamId)
      && (scope.email === null || s.email === scope.email);
  };
  for (const viewer of table) {
    const m = await member(viewer.email);
    for (const target of table) {
      assert.equal(matches(m, subject(target.email)), canSee(m, subject(target.email)), `${viewer.email} → ${target.email}`);
    }
  }
});

// ── The schema backs the rule ───────────────────────────────

const sql = readFileSync("db/migrations/0010_companies.sql", "utf8");

test("one company per person: the member's email is the primary key", () => {
  assert.match(sql, /create table if not exists course\.company_members \(\s*email text primary key/);
  assert.match(sql, /company_members_email_lowercase check \(email = lower\(email\)\)/);
});

test("a member's team must be one of their own company's teams", () => {
  assert.match(sql, /foreign key \(company_id, team_id\) references course\.teams \(company_id, id\)/);
});

test("roles are limited to the three, and a head needs a team", () => {
  assert.match(sql, /check \(role in \('hr', 'head', 'employee'\)\)/);
  assert.match(sql, /check \(role <> 'head' or team_id is not null\)/);
});
