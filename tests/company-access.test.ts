import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import type { Db } from "../src/lib/db/client";
import { membershipsLookup, workspaceLookup } from "../src/lib/company/lookup";
import {
  allowCompany,
  belongsTo,
  canSee,
  canSeeTeam,
  hasRole,
  isAdmin,
  resolveMember,
  resolveMemberships,
  scopeFor,
  seesCompany,
  viewOf,
  type CompanyMember,
  type CompanyRole,
  type MemberRow,
  type Subject,
} from "../src/lib/company/access";

/**
 * Two companies that must never see each other's data. Every test below is
 * someone trying to reach a row they shouldn't. One person (both@) is in both
 * companies with different responsibilities in each.
 */
const ACME = { id: "acme-id", slug: "acme", name: "Acme" };
const GLOBEX = { id: "globex-id", slug: "globex", name: "Globex" };

const row = (email: string, company: typeof ACME, roles: string[], team_id: string | null, lead_team_id: string | null = null): MemberRow => ({
  email, team_id, roles, lead_team_id, legacy_role: null, company_id: company.id, company_slug: company.slug, company_name: company.name,
});

const table: MemberRow[] = [
  row("hr@acme.com", ACME, ["admin"], null),
  row("eng-head@acme.com", ACME, ["team_lead"], "acme-eng", "acme-eng"),
  row("dev@acme.com", ACME, ["employee"], "acme-eng"),
  row("seller@acme.com", ACME, ["employee"], "acme-sales"),
  row("ceo@acme.com", ACME, ["company_head"], null),
  row("hiring@acme.com", ACME, ["recruiter", "reviewer"], null),
  row("both@x.com", ACME, ["employee", "recruiter"], "acme-sales"),
  row("both@x.com", GLOBEX, ["team_lead", "admin"], "globex-eng", "globex-eng"),
  row("hr@globex.com", GLOBEX, ["admin"], null),
  row("dev@globex.com", GLOBEX, ["employee"], "globex-eng"),
];
/** Lookup in one company: the workspace the link names. */
const lookupIn = (slug: string) => async (email: string) => table.find((r) => r.email === email && r.company_slug === slug) ?? null;
const lookupAll = async (email: string) => table.filter((r) => r.email === email);
const member = async (email: string, slug = email.endsWith("@globex.com") ? "globex" : "acme") => {
  const m = await resolveMember(email, lookupIn(slug));
  assert.ok(m, `${email} should be a member of ${slug}`);
  return m;
};

const subject = (email: string, slug = "acme"): Subject => {
  const r = table.find((x) => x.email === email && x.company_slug === slug) ?? table.find((x) => x.email === email)!;
  return { companyId: r.company_id, teamId: r.team_id, email: r.email };
};

// ── Who is a member ─────────────────────────────────────────

test("a member's company and responsibilities come from their rows, with the email canonicalised", async () => {
  assert.deepEqual(await resolveMember("  HR@Acme.COM ", lookupIn("acme")), {
    email: "hr@acme.com", roles: ["admin"], teamId: null, leadTeamId: null, companyId: ACME.id, companySlug: "acme", companyName: "Acme",
  });
});

test("responsibilities add up, in a fixed order, without repeats", async () => {
  const m = await resolveMember("x@acme.com", async () => row("x@acme.com", ACME, ["reviewer", "employee", "recruiter", "reviewer"], null));
  assert.deepEqual(m?.roles, ["recruiter", "reviewer", "employee"]);
});

test("an email with no row is nobody, whatever its domain says", async () => {
  assert.equal(await resolveMember("cfo@acme.com", lookupIn("acme")), null);
  assert.equal(await resolveMember("someone@gmail.com", lookupIn("acme")), null);
});

test("no session (unverified emails arrive as null) is nobody, and the table isn't asked", async () => {
  let asked = false;
  const spy = async () => { asked = true; return table[0]; };
  assert.equal(await resolveMember(null, spy), null);
  assert.equal(await resolveMember(undefined, spy), null);
  assert.equal(await resolveMember("not-an-email", spy), null);
  assert.equal(asked, false);
});

test("a removed member (row gone from the lookup) loses access straight away", async () => {
  const shrinking = [...table];
  const live = async (email: string) => shrinking.find((r) => r.email === email && r.company_slug === "acme") ?? null;
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
  assert.deepEqual(await resolveMemberships("hr@acme.com", async () => null), []);
});

test("unknown responsibilities grant nothing", async () => {
  for (const role of ["owner", "HR", "hr", "", "admin "]) {
    assert.equal(await resolveMember("x@acme.com", async () => row("x@acme.com", ACME, [role], "acme-eng")), null, role);
  }
  // A known one beside an unknown one still counts, alone.
  assert.deepEqual((await resolveMember("x@acme.com", async () => row("x@acme.com", ACME, ["owner", "employee"], null)))?.roles, ["employee"]);
});

test("a team lead with no team grants nothing, rather than every team", async () => {
  assert.equal(await resolveMember("x@acme.com", async () => row("x@acme.com", ACME, ["team_lead"], null, null)), null);
  // Their other responsibilities still stand.
  const m = await resolveMember("x@acme.com", async () => row("x@acme.com", ACME, ["team_lead", "employee"], null, null));
  assert.deepEqual(m?.roles, ["employee"]);
  assert.equal(m?.leadTeamId, null);
});

test("a lead team on a row without the team_lead role is ignored", async () => {
  const m = await resolveMember("x@acme.com", async () => row("x@acme.com", ACME, ["employee"], "acme-eng", "acme-eng"));
  assert.equal(m?.leadTeamId, null);
  assert.equal(viewOf(m!), "self");
});

// ── Before migration 0047 (a preview on an unmigrated database) ─

test("with no roles rows, the one old role is read: hr → admin, head → team lead, employee", async () => {
  const legacy = (role: string, team: string | null) => ({ ...row("x@acme.com", ACME, [], team), roles: null, legacy_role: role });
  assert.deepEqual((await resolveMember("x@acme.com", async () => legacy("hr", null)))?.roles, ["admin"]);
  const head = await resolveMember("x@acme.com", async () => legacy("head", "acme-eng"));
  assert.deepEqual([head?.roles, head?.leadTeamId], [["team_lead"], "acme-eng"]);
  assert.deepEqual((await resolveMember("x@acme.com", async () => legacy("employee", null)))?.roles, ["employee"]);
  assert.equal(await resolveMember("x@acme.com", async () => legacy("head", null)), null);
  assert.equal(await resolveMember("x@acme.com", async () => legacy("owner", null)), null);
});

test("roles rows win over the old column when both are there", async () => {
  const m = await resolveMember("x@acme.com", async () => ({ ...row("x@acme.com", ACME, ["employee"], null), legacy_role: "hr" }));
  assert.deepEqual(m?.roles, ["employee"]);
});

// ── Several companies ───────────────────────────────────────

test("one email in two companies has separate responsibilities in each", async () => {
  const inAcme = await member("both@x.com", "acme");
  const inGlobex = await member("both@x.com", "globex");
  assert.deepEqual(inAcme.roles, ["recruiter", "employee"]);
  assert.deepEqual(inGlobex.roles, ["admin", "team_lead"]);
  assert.equal(isAdmin(inAcme), false);
  assert.equal(isAdmin(inGlobex), true);
  assert.equal(inAcme.companyId, ACME.id);
  assert.equal(inGlobex.companyId, GLOBEX.id);
});

test("being admin in one company opens nothing in the other", async () => {
  const inAcme = await member("both@x.com", "acme");
  assert.equal(allowCompany(inAcme, "globex"), false);
  assert.equal(canSee(inAcme, subject("dev@acme.com")), false);
  assert.equal(canSee(inAcme, subject("dev@globex.com", "globex")), false);
});

test("memberships list every company, by name", async () => {
  const all = await resolveMemberships("both@x.com", lookupAll);
  assert.deepEqual(all.map((m) => m.companySlug), ["acme", "globex"]);
  assert.deepEqual((await resolveMemberships("hr@acme.com", lookupAll)).map((m) => m.companySlug), ["acme"]);
  assert.deepEqual(await resolveMemberships("nobody@x.com", lookupAll), []);
  assert.deepEqual(await resolveMemberships(null, lookupAll), []);
});

// ── The company in the URL ──────────────────────────────────

test("a member may open their own company's pages", async () => {
  assert.equal(belongsTo(await member("dev@acme.com"), "acme"), true);
  assert.equal(belongsTo(await member("dev@acme.com"), "ACME"), true);
});

test("changing the slug in the URL never opens another company", async () => {
  for (const email of ["hr@acme.com", "eng-head@acme.com", "dev@acme.com", "ceo@acme.com"]) {
    assert.equal(belongsTo(await member(email), "globex"), false, email);
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

test("admin-only pages turn away every other responsibility", async () => {
  assert.equal(isAdmin(await member("hr@acme.com")), true);
  for (const email of ["eng-head@acme.com", "dev@acme.com", "ceo@acme.com", "hiring@acme.com"]) {
    assert.equal(isAdmin(await member(email)), false, email);
  }
  assert.equal(hasRole(null, ["admin", "employee"]), false);
  assert.equal(hasRole(await member("hiring@acme.com"), ["reviewer"]), true);
});

// ── The server check (requireCompany) ───────────────────────
// requireCompany is getWorkspaceMember + allowCompany, and getWorkspaceMember
// is resolveMember(verified email, workspaceLookup(db, slug)). These run that
// same chain with the database faked.

/** A fake database answering the workspace and memberships queries from `table`, or failing. */
function fakeDb(opts: { fail?: string; forced?: MemberRow[]; seen?: { text: string; values: unknown[] }[] } = {}): Pick<Db, "rows"> {
  return {
    async rows<T>(strings: TemplateStringsArray, ...values: unknown[]) {
      const text = strings.join("$");
      opts.seen?.push({ text, values });
      if (opts.fail) return { data: null, error: Object.assign(new Error("failed"), { code: opts.fail }) };
      const legacy = !text.includes("company_member_roles");
      const pick = (r: MemberRow) => (legacy ? { ...r, roles: null, lead_team_id: null } : r);
      const found = opts.forced ?? table.filter((r) => r.email === values[0] && (values.length < 2 || r.company_slug === values[1]));
      return { data: found.map(pick) as T[], error: null };
    },
  };
}

const check = async (email: unknown, slug: unknown, roles?: CompanyRole[], db = fakeDb()) =>
  allowCompany(await resolveMember(email, workspaceLookup(db, slug)), slug, roles);

test("server check: a member gets their own company, and only theirs", async () => {
  assert.equal(await check("dev@acme.com", "acme"), true);
  assert.equal(await check("dev@acme.com", "globex"), false);
  assert.equal(await check("hr@globex.com", "acme"), false);
  assert.equal(await check("both@x.com", "acme"), true);
  assert.equal(await check("both@x.com", "globex"), true);
});

test("server check: role-only pages within your own company", async () => {
  assert.equal(await check("hr@acme.com", "acme", ["admin"]), true);
  assert.equal(await check("eng-head@acme.com", "acme", ["admin"]), false);
  assert.equal(await check("dev@acme.com", "acme", ["admin", "team_lead"]), false);
  // The right role in the wrong company is still refused, and so is a role held only elsewhere.
  assert.equal(await check("hr@globex.com", "acme", ["admin"]), false);
  assert.equal(await check("both@x.com", "acme", ["admin"]), false);
  assert.equal(await check("both@x.com", "globex", ["admin"]), true);
});

test("server check: signed out or not a member is refused", async () => {
  assert.equal(await check(null, "acme"), false);
  assert.equal(await check("stranger@acme.com", "acme"), false);
});

test("server check: a database error refuses everyone (fails closed)", async () => {
  const down = fakeDb({ fail: "08006" });
  for (const r of table) assert.equal(await check(r.email, r.company_slug, undefined, down), false, r.email);
  assert.deepEqual(await resolveMemberships("both@x.com", membershipsLookup(down)), []);
});

test("server check: without the roles table (42P01), the old role column is used", async () => {
  // The first query names company_member_roles and fails; the second doesn't, and is answered.
  const texts: string[] = [];
  const legacyDb: Pick<Db, "rows"> = {
    async rows<T>(strings: TemplateStringsArray) {
      texts.push(strings.join("$"));
      if (texts.length === 1) return { data: null, error: Object.assign(new Error("no table"), { code: "42P01" }) };
      return { data: [{ ...row("dev@acme.com", ACME, [], "acme-eng"), roles: null, legacy_role: "employee" }] as T[], error: null };
    },
  };
  assert.deepEqual((await resolveMember("dev@acme.com", workspaceLookup(legacyDb, "acme")))?.roles, ["employee"]);
  assert.match(texts[0], /company_member_roles/);
  assert.doesNotMatch(texts[1], /company_member_roles/);
});

test("the lookups ask by exact email (and slug), as parameters, never pasted into the SQL", async () => {
  const seen: { text: string; values: unknown[] }[] = [];
  await check("dev@acme.com", "acme", undefined, fakeDb({ seen }));
  await resolveMemberships("dev@acme.com", membershipsLookup(fakeDb({ seen })));
  assert.equal(seen.length, 2);
  assert.deepEqual(seen[0].values, ["dev@acme.com", "acme"]);
  assert.match(seen[0].text, /where m\.email = \$ and c\.slug = \$ and m\.removed_at is null/);
  assert.deepEqual(seen[1].values, ["dev@acme.com"]);
  assert.match(seen[1].text, /where m\.email = \$ and m\.removed_at is null/);
  for (const s of seen) {
    assert.doesNotMatch(s.text, /ilike|like/i);
    assert.doesNotMatch(s.text, /dev@acme\.com/);
  }
});

// ── The workspace comes from the URL (workspaceLookup) ──────

test("workspace: the slug is matched as the database stores it, case aside", async () => {
  assert.equal(await check("dev@acme.com", "ACME"), true);
});

test("workspace: a malformed slug never reaches the database", async () => {
  for (const slug of ["", "acme/../globex", "acme%2f", "-acme", "acme--x", "a".repeat(61), null, 7, ["acme"]]) {
    const seen: { text: string; values: unknown[] }[] = [];
    assert.equal(await resolveMember("dev@acme.com", workspaceLookup(fakeDb({ seen }), slug)), null, String(slug));
    assert.equal(seen.length, 0, `${String(slug)} was queried`);
  }
});

test("workspace: a row for another company, or more than one row, is refused", async () => {
  const globexRow = table.find((r) => r.email === "hr@globex.com")!;
  assert.equal(await resolveMember("hr@acme.com", workspaceLookup(fakeDb({ forced: [{ ...globexRow, email: "hr@acme.com" }] }), "acme")), null);
  const acmeRow = table.find((r) => r.email === "hr@acme.com")!;
  assert.equal(await resolveMember("hr@acme.com", workspaceLookup(fakeDb({ forced: [acmeRow, acmeRow] }), "acme")), null);
});

test("workspace: every /org/[slug] check goes through the workspace lookup", () => {
  const auth = readFileSync("src/lib/company/auth.ts", "utf8");
  const body = (name: string) => auth.slice(auth.indexOf(`function ${name}`), auth.indexOf("\n}\n", auth.indexOf(`function ${name}`)));
  assert.match(body("requireCompany"), /getWorkspaceMember\(slug\)/);
  assert.match(body("adminFor"), /getWorkspaceMember\(slug\)/);
  assert.match(body("adminFor"), /isAdmin\(member\)/);
  assert.match(auth, /workspaceLookup\(sql, slug\)/);
});

// ── Whose data a member may see ─────────────────────────────

test("an admin sees everyone in their company and no one in another", async () => {
  const hr = await member("hr@acme.com");
  for (const email of ["eng-head@acme.com", "dev@acme.com", "seller@acme.com", "ceo@acme.com"]) assert.equal(canSee(hr, subject(email)), true, email);
  for (const email of ["hr@globex.com", "dev@globex.com"]) assert.equal(canSee(hr, subject(email, "globex")), false, email);
});

test("a company head sees the whole company too, and changes nothing", async () => {
  const ceo = await member("ceo@acme.com");
  assert.equal(seesCompany(ceo), true);
  assert.equal(isAdmin(ceo), false);
  for (const email of ["dev@acme.com", "seller@acme.com", "hr@acme.com"]) assert.equal(canSee(ceo, subject(email)), true, email);
  assert.equal(canSee(ceo, subject("dev@globex.com", "globex")), false);
});

test("a team lead sees their own team only", async () => {
  const head = await member("eng-head@acme.com");
  assert.equal(canSee(head, subject("dev@acme.com")), true);
  assert.equal(canSee(head, subject("seller@acme.com")), false);
  assert.equal(canSee(head, subject("hr@acme.com")), false);
  assert.equal(canSee(head, subject("dev@globex.com", "globex")), false);
});

test("an employee, recruiter or reviewer sees only themselves, for now", async () => {
  for (const email of ["dev@acme.com", "hiring@acme.com"]) {
    const m = await member(email);
    assert.equal(canSee(m, subject(email)), true);
    for (const other of ["eng-head@acme.com", "hr@acme.com", "seller@acme.com"]) assert.equal(canSee(m, subject(other)), false, `${email} → ${other}`);
    assert.equal(canSee(m, subject("dev@globex.com", "globex")), false);
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

test("team pages: admins and company heads any team in their company, a lead their own, others none", async () => {
  const eng = { companyId: ACME.id, teamId: "acme-eng" };
  const sales = { companyId: ACME.id, teamId: "acme-sales" };
  const globexEng = { companyId: GLOBEX.id, teamId: "globex-eng" };
  for (const email of ["hr@acme.com", "ceo@acme.com"]) {
    const m = await member(email);
    assert.deepEqual([canSeeTeam(m, eng), canSeeTeam(m, sales), canSeeTeam(m, globexEng)], [true, true, false], email);
  }
  const head = await member("eng-head@acme.com");
  assert.deepEqual([canSeeTeam(head, eng), canSeeTeam(head, sales), canSeeTeam(head, globexEng)], [true, false, false]);
  assert.equal(canSeeTeam(await member("dev@acme.com"), eng), false);
});

// ── The filter data queries apply ───────────────────────────

test("every query scope is pinned to the member's own company", async () => {
  for (const r of table) assert.equal(scopeFor((await resolveMember(r.email, lookupIn(r.company_slug)))!).companyId, r.company_id, r.email);
});

test("query scopes: company for admins and heads, the team for a lead, themselves otherwise", async () => {
  assert.deepEqual(scopeFor(await member("hr@acme.com")), { companyId: ACME.id, teamId: null, email: null });
  assert.deepEqual(scopeFor(await member("ceo@acme.com")), { companyId: ACME.id, teamId: null, email: null });
  assert.deepEqual(scopeFor(await member("eng-head@acme.com")), { companyId: ACME.id, teamId: "acme-eng", email: null });
  assert.deepEqual(scopeFor(await member("dev@acme.com")), { companyId: ACME.id, teamId: null, email: "dev@acme.com" });
  assert.deepEqual(scopeFor(await member("hiring@acme.com")), { companyId: ACME.id, teamId: null, email: "hiring@acme.com" });
  // The widest responsibility wins: an admin who also leads a team sees the company.
  assert.deepEqual(scopeFor(await member("both@x.com", "globex")), { companyId: GLOBEX.id, teamId: null, email: null });
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
    const m = (await resolveMember(viewer.email, lookupIn(viewer.company_slug)))!;
    for (const target of table) {
      const s = { companyId: target.company_id, teamId: target.team_id, email: target.email };
      assert.equal(matches(m, s), canSee(m, s), `${viewer.email}@${viewer.company_slug} → ${target.email}@${target.company_slug}`);
    }
  }
});

// ── The schema backs the rule ───────────────────────────────

const sql0010 = readFileSync("db/migrations/0010_companies.sql", "utf8");
const sql0047 = readFileSync("db/migrations/0047_company_member_roles.sql", "utf8");

test("several companies per person: the membership key becomes (company, email)", () => {
  assert.match(sql0010, /company_members_email_lowercase check \(email = lower\(email\)\)/);
  assert.match(sql0047, /add constraint company_members_pkey primary key \(company_id, email\)/);
  assert.match(sql0047, /drop constraint if exists company_signin_codes_email_fkey/);
});

test("a member's team must be one of their own company's teams", () => {
  assert.match(sql0010, /foreign key \(company_id, team_id\) references course\.teams \(company_id, id\)/);
  assert.match(sql0047, /foreign key \(company_id, team_id\) references course\.teams \(company_id, id\)/);
});

test("responsibilities are limited to the six, a lead needs a team, and a team has one lead", () => {
  assert.match(sql0047, /check \(role in \('admin', 'company_head', 'recruiter', 'reviewer', 'team_lead', 'employee'\)\)/);
  assert.match(sql0047, /check \(\(role = 'team_lead'\) = \(team_id is not null\)\)/);
  assert.match(sql0047, /exclude using btree \(team_id with =\) where \(role = 'team_lead'\)/);
  assert.match(sql0047, /references course\.company_members \(company_id, email\)\s*on delete cascade/);
});

test("the old role column is kept right for the release before this one", () => {
  assert.match(sql0010, /check \(role in \('hr', 'head', 'employee'\)\)/);
  assert.match(sql0047, /when bool_or\(r\.role = 'admin'\) then 'hr'/);
  assert.match(sql0047, /after insert or update or delete on course\.company_member_roles/);
});
