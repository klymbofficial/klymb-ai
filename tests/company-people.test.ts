import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  MAX_CSV_ROWS,
  grantedRoles,
  leadBlocked,
  leadsAfterMove,
  parseCsv,
  planAdd,
  readPeopleCsv,
  removeBlocked,
  rolesBlocked,
  teamKey,
  teamName,
  type AddContext,
  type CsvPerson,
} from "../src/lib/company/people";

// Tasks 1.8 (People), 1.10 (Teams) and 1.11 (remove employee).

const read = (p: string) => readFileSync(p, "utf8");
/** One top-level function's source, from its signature to its closing brace. */
function fnSource(src: string, name: string): string {
  const start = src.indexOf(`export async function ${name}(`);
  assert.ok(start >= 0, `${name} not found`);
  return src.slice(start, src.indexOf("\n}\n", start) + 2);
}

function ctx(over: Partial<AddContext> = {}): AddContext {
  return {
    seatCount: 10,
    activeMembers: 2,
    teams: new Map([["sales", "team-sales"], ["data science", "team-ds"]]),
    existing: new Map(),
    ...over,
  };
}
const person = (line: number, email: string, team: string | null = null): CsvPerson => ({ line, email, name: null, team });

// ── CSV reading ─────────────────────────────────────────────

test("parseCsv handles quotes, commas in quotes, CRLF, a BOM and blank lines", () => {
  const rows = parseCsv('﻿email,name\r\n"a@x.com","Rao, Asha"\r\n\r\nb@x.com,"Say ""hi"""\n');
  assert.deepEqual(rows.map((r) => r.cells), [["email", "name"], ["a@x.com", "Rao, Asha"], ["b@x.com", 'Say "hi"']]);
  assert.deepEqual(rows.map((r) => r.line), [1, 2, 4], "line numbers match the file, blank lines included");
});

test("parseCsv keeps a quoted line break inside one record, numbered from its first line", () => {
  const rows = parseCsv('email,name\na@x.com,"two\nlines"\nb@x.com,\n');
  assert.equal(rows.length, 3);
  assert.equal(rows[1].cells[1], "two\nlines");
  assert.equal(rows[2].line, 4);
});

test("readPeopleCsv reads email, name and team in any order, ignoring header case", () => {
  const { people, errors } = readPeopleCsv("Team,EMAIL,Name\nSales, a@x.com ,  Asha   Rao \n,b@x.com,\n");
  assert.deepEqual(errors, []);
  assert.deepEqual(people, [
    { line: 2, email: "a@x.com", name: "Asha Rao", team: "Sales" },
    { line: 3, email: "b@x.com", name: null, team: null },
  ]);
});

test("readPeopleCsv needs a header with an email column", () => {
  assert.equal(readPeopleCsv("").errors[0].message, "The file is empty.");
  const noEmail = readPeopleCsv("a@x.com,Asha\n");
  assert.equal(noEmail.people.length, 0);
  assert.equal(noEmail.errors[0].line, 1);
  assert.match(noEmail.errors[0].message, /must name the columns/);
});

test("readPeopleCsv reports unknown and repeated columns, and a header with no people", () => {
  const { errors } = readPeopleCsv("email,phone,email\n");
  const messages = errors.map((e) => e.message).join(" | ");
  assert.match(messages, /Unknown column: phone/);
  assert.match(messages, /Column named twice: email/);
  assert.match(messages, /header but no people/);
});

test("readPeopleCsv flags a row with extra values, by its line", () => {
  const { errors } = readPeopleCsv("email,name\na@x.com,Asha,Rao\nb@x.com,Ben,\n");
  assert.deepEqual(errors.map((e) => e.line), [2], "a trailing empty cell is fine; a real extra value is not");
});

test(`readPeopleCsv refuses more than ${MAX_CSV_ROWS} people`, () => {
  const body = Array.from({ length: MAX_CSV_ROWS + 1 }, (_, i) => `p${i}@x.com`).join("\n");
  const { people, errors } = readPeopleCsv(`email\n${body}\n`);
  assert.equal(people.length, 0);
  assert.match(errors[0].message, new RegExp(`at most ${MAX_CSV_ROWS}`));
  assert.equal(readPeopleCsv(`email\n${body.split("\n").slice(0, MAX_CSV_ROWS).join("\n")}\n`).errors.length, 0);
});

// ── Planning an add ─────────────────────────────────────────

test("planAdd adds valid people with teams matched by name, ignoring case and spacing", () => {
  const plan = planAdd([person(2, "A@X.com", "SALES"), person(3, "b@x.com", "  data   science "), person(4, "c@x.com")], ctx());
  assert.equal(plan.ok, true);
  assert.deepEqual(plan.add.map((p) => [p.email, p.teamId, p.role, p.returning]), [
    ["a@x.com", "team-sales", "employee", false],
    ["b@x.com", "team-ds", "employee", false],
    ["c@x.com", null, "employee", false],
  ]);
});

test("planAdd is all or nothing, and lists every problem by line", () => {
  const plan = planAdd(
    [
      person(2, "ok@x.com"),
      person(3, "not-an-email"),
      person(4, ""),
      person(5, "OK@x.com"),
      person(6, "here@x.com"),
      person(7, "d@x.com", "Marketing"),
    ],
    ctx({ existing: new Map([["here@x.com", { removed: false }]]) }),
  );
  assert.equal(plan.ok, false);
  assert.deepEqual(plan.add, [], "nobody is added when any row fails");
  assert.deepEqual(plan.errors.map((e) => e.line), [3, 4, 5, 6, 7]);
  const text = plan.errors.map((e) => e.message);
  assert.match(text[0], /isn't a valid email/);
  assert.match(text[1], /email is missing/);
  assert.match(text[2], /already on line 2/);
  assert.match(text[3], /already in your company/);
  assert.match(text[4], /no team called "Marketing"/);
});

test("planAdd brings back a removed member of the same company", () => {
  const plan = planAdd([person(2, "back@x.com")], ctx({ existing: new Map([["back@x.com", { removed: true }]]) }));
  assert.equal(plan.ok, true);
  assert.equal(plan.add[0].returning, true);
});

test("planAdd takes people in other companies and Klymb learners: only this company's rows are asked about", () => {
  // AddContext holds no other company and no learners, so nothing can refuse them.
  const plan = planAdd([person(2, "in-another-company@x.com"), person(3, "learner@x.com")], ctx());
  assert.equal(plan.ok, true);
  assert.equal(plan.add.length, 2);
  const data = read("src/lib/company/people-data.ts");
  const load = fnSource(data, "loadAddContext");
  assert.doesNotMatch(load, /course\.learners/);
  assert.match(load, /where company_id = \$\{companyId\}::uuid and email = any/);
});

test("planAdd keeps to the seat limit, counting only active members", () => {
  const three = [person(2, "a@x.com"), person(3, "b@x.com"), person(4, "c@x.com")];
  assert.equal(planAdd(three, ctx({ seatCount: 5, activeMembers: 2 })).ok, true, "exactly fills the seats");
  const over = planAdd(three, ctx({ seatCount: 5, activeMembers: 3 }));
  assert.equal(over.ok, false);
  assert.equal(over.errors[0].line, null);
  assert.match(over.errors[0].message, /adds 3 people, but only 2 of 5 seats are free/);

  const one = planAdd([{ ...person(1, "a@x.com"), role: "admin" }], ctx({ seatCount: 2, activeMembers: 2 }));
  assert.match(one.errors[0].message, /needs a free seat, and all 2 are taken/);
  assert.equal(planAdd([{ ...person(1, "a@x.com"), role: "admin" }], ctx()).add[0].role, "admin");
});

test("teamKey matches the way team names are compared", () => {
  assert.equal(teamKey("  Data   Science "), "data science");
});

// ── Removing, heads and moves ───────────────────────────────

test("removeBlocked protects admins: not yourself, never the last admin", () => {
  const employee = { email: "e@x.com", roles: ["employee"], removed: false };
  const admin2 = { email: "a2@x.com", roles: ["admin", "recruiter"], removed: false };
  assert.equal(removeBlocked({ actorEmail: "a@x.com", target: employee, activeAdmins: 1 }), null);
  assert.match(removeBlocked({ actorEmail: "a@x.com", target: null, activeAdmins: 1 })!, /isn't in your company/);
  assert.match(removeBlocked({ actorEmail: "a@x.com", target: { ...employee, removed: true }, activeAdmins: 1 })!, /already been removed/);
  assert.match(removeBlocked({ actorEmail: "a@x.com", target: { email: "a@x.com", roles: ["admin"], removed: false }, activeAdmins: 2 })!, /can't remove yourself/);
  assert.match(removeBlocked({ actorEmail: "a@x.com", target: admin2, activeAdmins: 1 })!, /last admin/);
  assert.equal(removeBlocked({ actorEmail: "a@x.com", target: admin2, activeAdmins: 2 }), null);
  assert.equal(removeBlocked({ actorEmail: "a@x.com", target: { ...employee, roles: ["team_lead"] }, activeAdmins: 1 }), null, "a lead can be removed; the team is left without one");
});

test("grantedRoles keeps known grantable roles only, once each, in a fixed order", () => {
  assert.deepEqual(grantedRoles(["employee", "recruiter", "admin", "recruiter"]), ["admin", "recruiter", "employee"]);
  assert.deepEqual(grantedRoles([]), []);
  assert.equal(grantedRoles(["team_lead"]), null, "a team's lead is set on the Teams page");
  assert.equal(grantedRoles(["owner"]), null);
  assert.equal(grantedRoles("admin"), null);
  assert.equal(grantedRoles([1]), null);
  assert.equal(grantedRoles(Array(20).fill("employee")), null);
});

test("rolesBlocked: at least one responsibility, own admin kept, last admin kept", () => {
  const target = (roles: string[], email = "t@x.com") => ({ email, roles, removed: false });
  const base = { actorEmail: "a@x.com", activeAdmins: 2 };
  assert.equal(rolesBlocked({ ...base, target: target(["employee"]), next: ["recruiter", "reviewer"] }), null);
  assert.match(rolesBlocked({ ...base, target: target(["employee"]), next: [] })!, /at least one/);
  assert.equal(rolesBlocked({ ...base, target: target(["team_lead", "employee"]), next: [] }), null, "leading a team is a responsibility");
  assert.match(rolesBlocked({ ...base, target: target(["admin"], "a@x.com"), next: ["employee"] })!, /your own admin/);
  assert.equal(rolesBlocked({ ...base, target: target(["admin"], "a@x.com"), next: ["admin", "recruiter"] }), null, "an admin may add to their own");
  assert.match(rolesBlocked({ ...base, activeAdmins: 1, target: target(["admin"]), next: ["employee"] })!, /last admin/);
  assert.equal(rolesBlocked({ ...base, target: target(["admin"]), next: ["company_head"] }), null);
  assert.match(rolesBlocked({ ...base, target: null, next: ["employee"] })!, /isn't in your company/);
  assert.match(rolesBlocked({ ...base, target: { ...target(["employee"]), removed: true }, next: ["employee"] })!, /isn't in your company/);
});

test("teamName tidies spacing and refuses empty or long names", () => {
  assert.deepEqual(teamName("  Data   Science "), { ok: true, value: "Data Science" });
  assert.equal(teamName("   ").ok, false);
  assert.equal(teamName(42).ok, false);
  assert.equal(teamName("x".repeat(61)).ok, false);
});

test("leadBlocked: any active member can lead a team, admins included", () => {
  assert.equal(leadBlocked({ removed: false }), null);
  assert.ok(leadBlocked({ removed: true }));
  assert.ok(leadBlocked(null));
});

test("leadsAfterMove: a lead who changes team stops leading the old one", () => {
  assert.equal(leadsAfterMove("t1", "t2"), null);
  assert.equal(leadsAfterMove("t1", null), null);
  assert.equal(leadsAfterMove("t1", "t1"), "t1");
  assert.equal(leadsAfterMove(null, "t2"), null);
});

// ── The database and the access check ───────────────────────

test("migration 0013 adds removed_at and one head per team, safely re-runnable", () => {
  const sql = read("db/migrations/0013_company_members_removed.sql");
  assert.match(sql, /add column if not exists removed_at timestamptz/);
  assert.match(sql, /exclude using btree \(team_id with =\) where \(role = 'head' and removed_at is null\)/);
  assert.match(sql, /deferrable initially deferred/, "so a head can be swapped in one statement");
  assert.match(sql, /if not exists \(select 1 from pg_constraint/);
});

test("removed people get no access: lookup and code sign-in skip them", () => {
  assert.match(read("src/lib/company/lookup.ts"), /where m\.email = \$\{email\} and m\.removed_at is null/);
  assert.match(read("src/lib/company/lookup.ts"), /where m\.email = \$\{email\} and c\.slug = \$\{wanted\} and m\.removed_at is null/);
  const store = read("src/lib/company/signin-store.ts");
  const isMember = store.slice(store.indexOf("isMember"), store.indexOf("save"));
  assert.match(isMember, /removed_at is null/);
  const take = store.slice(store.indexOf("takeAttempt"));
  assert.match(take.slice(0, take.indexOf("`,") > 0 ? take.indexOf("`,") : undefined), /removed_at is null/);
});

test("removed people free their seat in the admin's counts too", () => {
  const data = read("src/lib/admin/companies-data.ts");
  assert.ok((data.match(/removed_at is null/g) ?? []).length >= 2);
});

test("removing stamps removed_at (data stays), ends this company's roles, keeps a code another company still needs, and re-checks admin rules", () => {
  const data = read("src/lib/company/people-data.ts");
  const fn = fnSource(data, "removePersonRow");
  assert.match(fn, /set removed_at = now\(\)/);
  assert.doesNotMatch(fn, /delete from course\.company_members/, "the person's row is never deleted");
  assert.match(fn, /delete from course\.company_member_roles x using r\s+where x\.company_id = \$\{companyId\}::uuid/);
  assert.match(fn, /delete from course\.company_signin_codes/);
  assert.match(fn, /o\.company_id <> \$\{companyId\}::uuid/);
  assert.match(fn, /email <> \$\{actorEmail\}/);
  assert.match(fn, /a\.role = 'admin'/);
});

test("adding re-checks seats inside the insert, gives the first role, and only revives this company's removed rows", () => {
  const data = read("src/lib/company/people-data.ts");
  const fn = fnSource(data, "insertPeople");
  assert.match(fn, /<= \(select seat_count from course\.companies/);
  assert.match(fn, /where g\.fits and g\.free and g\.teams_ok/);
  assert.doesNotMatch(fn, /course\.learners/, "Klymb learners may join");
  assert.match(fn, /on conflict \(company_id, email\) do update\s+set removed_at = null/);
  assert.match(fn, /where m\.removed_at is not null/);
  assert.match(fn, /insert into course\.company_member_roles/);
});

test("every People and Teams action checks for an admin of this company first", () => {
  for (const file of ["src/app/org/[slug]/(workspace)/people/actions.ts", "src/app/org/[slug]/(workspace)/teams/actions.ts"]) {
    const src = read(file);
    assert.match(src, /^"use server";/);
    const fns = src.split(/\nexport async function /).slice(1);
    assert.ok(fns.length >= 3, file);
    for (const fn of fns) {
      // The body starts after the return type (a parameter type can hold braces too).
      const body = fn.slice(fn.indexOf("> {"));
      // The first thing each action does is the admin check (addPerson hands straight to addPlanned, which does it).
      const first = body.match(/\b(adminFor|addPlanned|db)\(/)?.[1];
      assert.ok(first === "adminFor" || first === "addPlanned", `${file}: ${fn.slice(0, 30)} must check for an admin first (found ${first})`);
    }
    assert.doesNotMatch(src, /companyId:\s*form|formData\.get\("company/, "the company always comes from the login");
  }
});

test("both pages are admin-only: other roles get a role panel and nothing is loaded; the org layout checks membership (task 1.7)", () => {
  for (const page of ["people", "teams"]) {
    const src = read(`src/app/org/[slug]/(workspace)/${page}/page.tsx`);
    // Membership of this company is required, then the role; a non-admin member is stopped before any query.
    assert.match(src, /requireCompany\(slug\)/);
    const role = src.indexOf("!isAdmin(hr)");
    assert.ok(role > -1, `${page} checks the role`);
    assert.match(src.slice(role, role + 140), /return <RoleOnly/);
    assert.ok(role < src.indexOf("db()"), `${page} checks the role before touching the database`);
  }
  const layout = read("src/app/org/[slug]/(workspace)/layout.tsx");
  assert.match(layout, /getWorkspaceMember\(slug\)/);
  assert.match(layout, /allowCompany\(member, slug\)/);
});
