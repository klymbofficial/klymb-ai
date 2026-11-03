import { strict as assert } from "node:assert";
import { readFileSync, readdirSync } from "node:fs";
import { test } from "node:test";
import {
  MAX_CSV_ROWS,
  headBlocked,
  parseCsv,
  planAdd,
  readPeopleCsv,
  removeBlocked,
  roleAfterMove,
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
    learners: new Set(),
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
      person(6, "other@x.com"),
      person(7, "here@x.com"),
      person(8, "learner@x.com"),
      person(9, "d@x.com", "Marketing"),
    ],
    ctx({
      existing: new Map([
        ["other@x.com", { sameCompany: false, removed: false }],
        ["here@x.com", { sameCompany: true, removed: false }],
      ]),
      learners: new Set(["learner@x.com"]),
    }),
  );
  assert.equal(plan.ok, false);
  assert.deepEqual(plan.add, [], "nobody is added when any row fails");
  assert.deepEqual(plan.errors.map((e) => e.line), [3, 4, 5, 6, 7, 8, 9]);
  const text = plan.errors.map((e) => e.message);
  assert.match(text[0], /isn't a valid email/);
  assert.match(text[1], /email is missing/);
  assert.match(text[2], /already on line 2/);
  assert.match(text[3], /another company/);
  assert.match(text[4], /already in your company/);
  assert.match(text[5], /learner/);
  assert.match(text[6], /no team called "Marketing"/);
});

test("planAdd brings back a removed member of the same company", () => {
  const plan = planAdd([person(2, "back@x.com")], ctx({ existing: new Map([["back@x.com", { sameCompany: true, removed: true }]]) }));
  assert.equal(plan.ok, true);
  assert.equal(plan.add[0].returning, true);
});

test("planAdd never takes someone removed from a different company", () => {
  const plan = planAdd([person(2, "gone@x.com")], ctx({ existing: new Map([["gone@x.com", { sameCompany: false, removed: true }]]) }));
  assert.equal(plan.ok, false);
  assert.match(plan.errors[0].message, /another company/);
});

test("planAdd keeps to the seat limit, counting only active members", () => {
  const three = [person(2, "a@x.com"), person(3, "b@x.com"), person(4, "c@x.com")];
  assert.equal(planAdd(three, ctx({ seatCount: 5, activeMembers: 2 })).ok, true, "exactly fills the seats");
  const over = planAdd(three, ctx({ seatCount: 5, activeMembers: 3 }));
  assert.equal(over.ok, false);
  assert.equal(over.errors[0].line, null);
  assert.match(over.errors[0].message, /adds 3 people, but only 2 of 5 seats are free/);

  const one = planAdd([{ ...person(1, "a@x.com"), role: "hr" }], ctx({ seatCount: 2, activeMembers: 2 }));
  assert.match(one.errors[0].message, /needs a free seat, and all 2 are taken/);
  assert.equal(planAdd([{ ...person(1, "a@x.com"), role: "hr" }], ctx()).add[0].role, "hr");
});

test("teamKey matches the way team names are compared", () => {
  assert.equal(teamKey("  Data   Science "), "data science");
});

// ── Removing, heads and moves ───────────────────────────────

test("removeBlocked protects HR: not yourself, never the last HR", () => {
  const employee = { email: "e@x.com", role: "employee", removed: false };
  assert.equal(removeBlocked({ actorEmail: "hr@x.com", target: employee, activeHr: 1 }), null);
  assert.match(removeBlocked({ actorEmail: "hr@x.com", target: null, activeHr: 1 })!, /isn't in your company/);
  assert.match(removeBlocked({ actorEmail: "hr@x.com", target: { ...employee, removed: true }, activeHr: 1 })!, /already been removed/);
  assert.match(removeBlocked({ actorEmail: "hr@x.com", target: { email: "hr@x.com", role: "hr", removed: false }, activeHr: 2 })!, /can't remove yourself/);
  assert.match(removeBlocked({ actorEmail: "hr@x.com", target: { email: "hr2@x.com", role: "hr", removed: false }, activeHr: 1 })!, /last HR/);
  assert.equal(removeBlocked({ actorEmail: "hr@x.com", target: { email: "hr2@x.com", role: "hr", removed: false }, activeHr: 2 }), null);
  assert.equal(removeBlocked({ actorEmail: "hr@x.com", target: { ...employee, role: "head" }, activeHr: 1 }), null, "a head can be removed; the team is left without one");
});

test("teamName tidies spacing and refuses empty or long names", () => {
  assert.deepEqual(teamName("  Data   Science "), { ok: true, value: "Data Science" });
  assert.equal(teamName("   ").ok, false);
  assert.equal(teamName(42).ok, false);
  assert.equal(teamName("x".repeat(61)).ok, false);
});

test("headBlocked: only an active non-HR member can head a team", () => {
  assert.equal(headBlocked({ role: "employee", removed: false }), null);
  assert.equal(headBlocked({ role: "head", removed: false }), null);
  assert.ok(headBlocked({ role: "hr", removed: false }));
  assert.ok(headBlocked({ role: "employee", removed: true }));
  assert.ok(headBlocked(null));
});

test("roleAfterMove: a head who changes team becomes an employee", () => {
  assert.equal(roleAfterMove("head", "t1", "t2"), "employee");
  assert.equal(roleAfterMove("head", "t1", null), "employee");
  assert.equal(roleAfterMove("head", "t1", "t1"), "head");
  assert.equal(roleAfterMove("employee", "t1", "t2"), "employee");
  assert.equal(roleAfterMove("hr", null, "t2"), "hr");
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

test("removing stamps removed_at (data stays), ends codes, and re-checks HR rules in the statement", () => {
  const data = read("src/lib/company/people-data.ts");
  const fn = fnSource(data, "removePersonRow");
  assert.match(fn, /set removed_at = now\(\)/);
  assert.doesNotMatch(fn, /delete from course\.company_members/, "the person's row is never deleted");
  assert.match(fn, /delete from course\.company_signin_codes/);
  assert.match(fn, /email <> \$\{actorEmail\}/);
});

test("adding re-checks seats and learners inside the insert, and only revives this company's removed rows", () => {
  const data = read("src/lib/company/people-data.ts");
  const fn = fnSource(data, "insertPeople");
  assert.match(fn, /<= \(select seat_count from course\.companies/);
  assert.match(fn, /where g\.fits and g\.free and g\.not_learners and g\.teams_ok/);
  assert.match(fn, /course\.learners/);
  assert.match(fn, /on conflict \(email\) do update\s+set removed_at = null/);
  assert.match(fn, /removed_at is not null/);
  assert.match(fn, /company_id = excluded\.company_id/);
});

test("every People and Teams action checks for HR of this company first", () => {
  for (const file of ["src/app/org/[slug]/people/actions.ts", "src/app/org/[slug]/teams/actions.ts"]) {
    const src = read(file);
    assert.match(src, /^"use server";/);
    const fns = src.split(/\nexport async function /).slice(1);
    assert.ok(fns.length >= 3, file);
    for (const fn of fns) {
      // The body starts after the return type (a parameter type can hold braces too).
      const body = fn.slice(fn.indexOf("> {"));
      // The first thing each action does is the HR check (addPerson hands straight to addPlanned, which does it).
      const first = body.match(/\b(hrFor|addPlanned|db)\(/)?.[1];
      assert.ok(first === "hrFor" || first === "addPlanned", `${file}: ${fn.slice(0, 30)} must check HR first (found ${first})`);
    }
    assert.doesNotMatch(src, /companyId:\s*form|formData\.get\("company/, "the company always comes from the login");
  }
});

test("both pages are HR-only and the org folder has no layout yet (that is task 1.7)", () => {
  for (const page of ["people", "teams"]) {
    assert.match(read(`src/app/org/[slug]/${page}/page.tsx`), /requireCompany\(slug, \["hr"\]\)/);
  }
  assert.ok(!readdirSync("src/app/org/[slug]").includes("layout.tsx"));
});
