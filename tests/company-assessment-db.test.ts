import { strict as assert } from "node:assert";
import { randomUUID } from "node:crypto";
import { after, before, describe, test } from "node:test";
import { Client } from "pg";
import { connectionOptions } from "../src/lib/db/connection";
import type { Db, DbError } from "../src/lib/db/client";
import type { CatalogAssessment } from "../src/data/business-catalog";
import type { AssessmentContent } from "../src/lib/company/assessment-rules";

/**
 * Opt-in: runs only when TEST_DATABASE_URL points at a throwaway database
 * with migrations through 0051. It needs the react-server condition, since
 * the module it tests is server-only:
 *
 *   TEST_DATABASE_URL=postgres://... node --conditions=react-server --import tsx --test tests/company-assessment-db.test.ts
 *
 * It makes its own company and assessment slug. Published versions can't be
 * deleted (that is the point), so this run's versions and their catalog row
 * stay behind in the throwaway database. It refuses to run against the
 * app's own DATABASE_URL or DATABASE_MIGRATE_URL.
 */
const url = process.env.TEST_DATABASE_URL?.trim();
const skip = !url
  ? "TEST_DATABASE_URL is not set"
  : url === process.env.DATABASE_URL?.trim() || url === process.env.DATABASE_MIGRATE_URL?.trim()
    ? "TEST_DATABASE_URL is the app's own database; refusing"
    : false;


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

describe("assessment versions against a real database", { skip }, () => {
  const one = new Client(connectionOptions(url ?? ""));
  const two = new Client(connectionOptions(url ?? ""));
  const run = randomUUID().slice(0, 8);
  const slug = `test-${run}`;
  let companyId = "";
  let data: typeof import("../src/lib/company/assessment-data");
  let sqlA: Db;
  let sqlB: Db;

  const code = { kind: "assessment", slug, title: "Test practical", suggestedSkills: ["APIs"], suggestedPurposes: ["hiring"] } as unknown as CatalogAssessment;
  const content = (task: string): AssessmentContent => ({
    role: "Backend engineer", minutes: 60, submission: "written_file", toolsAllowed: ["Docs"], toolsNotAllowed: ["Another person"],
    instructions: "Write it up.", taskTitle: task, taskBrief: "Design it.", sampleTitle: "Practice", sampleBrief: "Try this.",
    rubric: [{ title: "API", skill: "APIs", points: 4, guide: "Clear endpoints." }], results: "none",
  });

  before(async () => {
    data = await import("../src/lib/company/assessment-data");
    await one.connect();
    await two.connect();
    sqlA = adapter(one);
    sqlB = adapter(two);
    companyId = (await one.query(`insert into course.companies (slug, name, seat_count) values ($1, 'Assessment test', 5) returning id`, [`assess-${run}`])).rows[0].id;
  });

  after(async () => {
    if (companyId) await one.query(`delete from course.companies where id = $1`, [companyId]);
    await one.query(`delete from course.assessment_drafts where slug = $1`, [slug]);
    await one.end();
    await two.end();
  });

  test("a draft saves only at the revision the editor opened", async () => {
    assert.deepEqual(await data.saveDraft(sqlA, code, content("Task one"), 0, "a@test.invalid"), { status: "saved", revision: 1 });
    assert.equal((await one.query(`select kind, status from course.catalog_items where slug = $1`, [slug])).rows[0].status, "draft", "the catalog row is made as a draft");
    assert.deepEqual(await data.saveDraft(sqlA, code, content("Someone else"), 0, "b@test.invalid"), { status: "changed" });
    assert.deepEqual(await data.saveDraft(sqlA, code, content("Task one"), 1, "a@test.invalid"), { status: "saved", revision: 2 });
    assert.equal((await data.loadDraft(sqlA, slug))?.taskTitle, "Task one");
  });

  test("publishing copies the draft at that revision into the next number, once", async () => {
    assert.deepEqual(await data.publishDraft(sqlA, slug, "Test practical", 1, "a@test.invalid"), { status: "changed" }, "a stale revision publishes nothing");
    const [x, y] = await Promise.all([
      data.publishDraft(sqlA, slug, "Test practical", 2, "a@test.invalid"),
      data.publishDraft(sqlB, slug, "Test practical", 2, "b@test.invalid"),
    ]);
    assert.deepEqual([x, y].map((r) => r?.status).sort(), ["changed", "published"], "two publishes at once make one version");
    await data.saveDraft(sqlA, code, content("Task two"), 2, "a@test.invalid");
    assert.deepEqual(await data.publishDraft(sqlA, slug, "Test practical", 3, "a@test.invalid"), { status: "published", version: 2 });
    const versions = await data.loadVersions(sqlA, slug);
    assert.deepEqual(versions?.map((v) => [v.version, v.taskTitle]), [[2, "Task two"], [1, "Task one"]], "version 1 keeps its task");
    assert.deepEqual(versions?.[1].rubric, content("x").rubric);
  });

  test("a published version can't be changed or removed", async () => {
    await assert.rejects(one.query(`update course.assessment_versions set task_title = 'Edited' where slug = $1`, [slug]), /cannot be changed/);
    await assert.rejects(one.query(`delete from course.assessment_versions where slug = $1`, [slug]), /cannot be changed/);
    const n = (await one.query(`select count(*)::int n from course.assessment_versions where slug = $1 and task_title = 'Edited'`, [slug])).rows[0].n;
    assert.equal(n, 0);
  });

  test("a company decides only the newest version, and keeps its last approval in use", async () => {
    const [v2, v1] = (await data.loadVersions(sqlA, slug))!;
    assert.equal(await data.setReview(sqlA, { companyId, slug, versionId: v1.id, decision: "approved", note: null, by: "r@test.invalid" }), false, "an older version can't be decided");
    assert.equal(await data.setReview(sqlA, { companyId, slug, versionId: v2.id, decision: "approved", note: null, by: "r@test.invalid" }), true);
    let s = (await data.companyStandings(sqlA, companyId, [slug]))!.get(slug)!;
    assert.deepEqual([s.latest?.version, s.latestReview?.decision, s.inUse?.version], [2, "approved", 2]);

    await data.saveDraft(sqlA, code, content("Task three"), 3, "a@test.invalid");
    await data.publishDraft(sqlA, slug, "Test practical", 4, "a@test.invalid");
    s = (await data.companyStandings(sqlA, companyId, [slug]))!.get(slug)!;
    assert.deepEqual([s.latest?.version, s.latestReview, s.inUse?.version], [3, null, 2], "version 2 stays in use until 3 is approved");

    const v3 = (await data.loadVersions(sqlA, slug))![0];
    await assert.rejects(one.query(`insert into course.company_assessment_reviews (company_id, version_id, decision, decided_by) values ($1, $2, 'declined', 'r')`, [companyId, v3.id]), /declined_note/);
    assert.equal(await data.setReview(sqlA, { companyId, slug, versionId: v3.id, decision: "declined", note: "Shorter brief", by: "r@test.invalid" }), true);
    assert.equal(await data.setReview(sqlA, { companyId, slug, versionId: v3.id, decision: "approved", note: null, by: "r@test.invalid" }), true, "a changed mind replaces the decision");
    s = (await data.companyStandings(sqlA, companyId, [slug]))!.get(slug)!;
    assert.equal(s.inUse?.version, 3);
  });
});
