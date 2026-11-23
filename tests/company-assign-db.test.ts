import { strict as assert } from "node:assert";
import { randomUUID } from "node:crypto";
import { after, before, describe, test } from "node:test";
import { Client } from "pg";
import { connectionOptions } from "../src/lib/db/connection";
import type { Db, DbError } from "../src/lib/db/client";

/**
 * Opt-in: runs only when TEST_DATABASE_URL points at a throwaway database
 * with migrations through 0050. It needs the react-server condition, since
 * the module it tests is server-only:
 *
 *   TEST_DATABASE_URL=postgres://... node --conditions=react-server --import tsx --test tests/company-assign-db.test.ts
 *
 * It makes its own company and removes it at the end. It refuses to run
 * against the app's own DATABASE_URL or DATABASE_MIGRATE_URL.
 */
const url = process.env.TEST_DATABASE_URL?.trim();
const skip = !url
  ? "TEST_DATABASE_URL is not set"
  : url === process.env.DATABASE_URL?.trim() || url === process.env.DATABASE_MIGRATE_URL?.trim()
    ? "TEST_DATABASE_URL is the app's own database; refusing"
    : false;

const COURSE = "system-design";

/** The app's Db over one connection. */
function adapter(client: Client): Db {
  const query = async (strings: TemplateStringsArray, values: unknown[]) => {
    let text = strings[0];
    for (let i = 0; i < values.length; i += 1) text += `$${i + 1}${strings[i + 1]}`;
    try {
      const r = await client.query(text, values);
      return { rows: r.rows, count: r.rowCount ?? 0, error: null };
    } catch (e) {
      return { rows: [], count: 0, error: e as DbError };
    }
  };
  return {
    async rows<T>(s: TemplateStringsArray, ...v: unknown[]) { const r = await query(s, v); return { data: r.error ? null : (r.rows as T[]), error: r.error }; },
    async row<T>(s: TemplateStringsArray, ...v: unknown[]) { const r = await query(s, v); return { data: r.error ? null : ((r.rows[0] as T) ?? null), error: r.error }; },
    async scalar<T>(s: TemplateStringsArray, ...v: unknown[]) { const r = await query(s, v); const f = r.rows[0]; return { data: r.error || !f ? null : (Object.values(f)[0] as T), error: r.error }; },
    async run(s: TemplateStringsArray, ...v: unknown[]) { const r = await query(s, v); return { data: r.error ? null : r.count, error: r.error }; },
  };
}

describe("company assignments against a real database", { skip }, () => {
  const one = new Client(connectionOptions(url ?? ""));
  const two = new Client(connectionOptions(url ?? ""));
  const run = randomUUID().slice(0, 8);
  const email = (n: string) => `${n}-${run}@test.invalid`;
  const ids = { company: "", eng: "", sales: "" };
  let data: typeof import("../src/lib/company/assign-data");
  let sqlA: Db;
  let sqlB: Db;

  const base = () => ({ companyId: ids.company, course: COURSE, requirement: "required" as const, dueOn: "2026-12-31", targetKind: "people" as const, teamId: null, label: "test", by: email("hr"), scopeTeamId: null });
  const live = async (who: string) => (await one.query(`select count(*)::int n from course.company_assignment_recipients where email = $1 and revoked_at is null`, [who])).rows[0].n as number;

  before(async () => {
    data = await import("../src/lib/company/assign-data");
    await one.connect();
    await two.connect();
    sqlA = adapter(one);
    sqlB = adapter(two);
    ids.company = (await one.query(`insert into course.companies (slug, name, seat_count) values ($1, 'Assign test', 20) returning id`, [`assign-${run}`])).rows[0].id;
    ids.eng = (await one.query(`insert into course.teams (company_id, name) values ($1, 'Eng') returning id`, [ids.company])).rows[0].id;
    ids.sales = (await one.query(`insert into course.teams (company_id, name) values ($1, 'Sales') returning id`, [ids.company])).rows[0].id;
    for (const [n, team] of [["ana", ids.eng], ["bo", ids.eng], ["cy", ids.sales], ["di", null], ["own", null]] as const) {
      await one.query(`insert into course.company_members (email, company_id, role, team_id) values ($1, $2, 'employee', $3)`, [email(n), ids.company, team]);
    }
    await one.query(`insert into course.enrollments (email, course, status, source) values ($1, $2, 'active', 'grant')`, [email("own"), COURSE]);
  });

  after(async () => {
    if (ids.company) await one.query(`delete from course.companies where id = $1`, [ids.company]);
    await one.query(`delete from course.enrollments where email = $1`, [email("own")]);
    await one.end();
    await two.end();
  });

  test("an assignment reaches exactly the previewed people, and the old table follows", async () => {
    const key = randomUUID();
    const out = await data.createAssignment(sqlA, { ...base(), requestKey: key, emails: [email("ana"), email("di")] });
    assert.equal(out?.status, "created");
    assert.equal(out?.status === "created" && out.added, 2);
    assert.equal(await live(email("ana")), 1);
    const legacy = await one.query(`select count(*)::int n from course.company_course_assignments where email = $1 and revoked_at is null`, [email("di")]);
    assert.equal(legacy.rows[0].n, 1);

    const again = await data.createAssignment(sqlA, { ...base(), requestKey: key, emails: [email("ana"), email("di")] });
    assert.deepEqual(again, { status: "repeat" }, "a retried submit lands once");
    const count = await one.query(`select count(*)::int n from course.company_assignments where company_id = $1`, [ids.company]);
    assert.equal(count.rows[0].n, 1);
  });

  test("if anyone previewed already has the course, nothing is written", async () => {
    const out = await data.createAssignment(sqlA, { ...base(), requestKey: randomUUID(), emails: [email("ana"), email("bo")] });
    assert.deepEqual(out, { status: "changed" });
    assert.equal(await live(email("bo")), 0);
    const own = await data.createAssignment(sqlA, { ...base(), requestKey: randomUUID(), emails: [email("own")] });
    assert.deepEqual(own, { status: "changed" }, "someone who bought it isn't assigned it");
  });

  test("two people assigning the same person at once: one wins, the other writes nothing", async () => {
    const [x, y] = await Promise.all([
      data.createAssignment(sqlA, { ...base(), requestKey: randomUUID(), emails: [email("bo")] }),
      data.createAssignment(sqlB, { ...base(), requestKey: randomUUID(), emails: [email("bo")] }),
    ]);
    assert.deepEqual([x?.status, y?.status].sort(), ["changed", "created"]);
    assert.equal(await live(email("bo")), 1);
  });

  test("a lead can't reach or take back anyone outside their team", async () => {
    const out = await data.createAssignment(sqlA, { ...base(), requestKey: randomUUID(), emails: [email("cy")], scopeTeamId: ids.eng });
    assert.deepEqual(out, { status: "changed" });
    assert.equal(await data.revokeRecipient(sqlA, ids.company, email("di"), COURSE, email("lead"), ids.eng), 0);
  });

  test("a team assignment keeps its people; someone joining later isn't added", async () => {
    await data.revokeRecipient(sqlA, ids.company, email("ana"), COURSE, email("hr"), null);
    await data.revokeRecipient(sqlA, ids.company, email("bo"), COURSE, email("hr"), null);
    const out = await data.createAssignment(sqlA, { ...base(), targetKind: "team", teamId: ids.eng, label: "Team: Eng", requestKey: randomUUID(), emails: [email("ana"), email("bo")] });
    assert.equal(out?.status, "created");
    await one.query(`insert into course.company_members (email, company_id, role, team_id) values ($1, $2, 'employee', $3)`, [email("late"), ids.company, ids.eng]);
    const list = await data.listAssignments(sqlA, ids.company, null);
    const team = list?.find((a) => a.label === "Team: Eng");
    assert.deepEqual(team?.recipients.map((r) => r.email).sort(), [email("ana"), email("bo")].sort());
  });

  test("taking it back frees the person for a new assignment, and a lead sees only their team's people", async () => {
    assert.equal(await data.revokeRecipient(sqlA, ids.company, email("di"), COURSE, email("hr"), null), 1);
    assert.equal(await live(email("di")), 0);
    const out = await data.createAssignment(sqlA, { ...base(), requirement: "recommended", dueOn: null, requestKey: randomUUID(), emails: [email("di")] });
    assert.equal(out?.status, "created");
    const lead = await data.listAssignments(sqlA, ids.company, ids.eng);
    for (const a of lead ?? []) for (const r of a.recipients) assert.ok([email("ana"), email("bo")].includes(r.email), r.email);
    const people = await data.loadAssignPeople(sqlA, ids.company, COURSE);
    assert.equal(people?.find((p) => p.email === email("own"))?.ownAccess, true);
    assert.equal(people?.find((p) => p.email === email("di"))?.assigned, true);
  });
});
