import { strict as assert } from "node:assert";
import { randomUUID } from "node:crypto";
import { after, before, describe, test } from "node:test";
import { Client } from "pg";
import { connectionOptions } from "../src/lib/db/connection";
import type { Db, DbError } from "../src/lib/db/client";
import type { AssessmentContent } from "../src/lib/company/assessment-rules";

/**
 * A company's own tests (U04a, migration 0086) against a real database.
 * TEST_DATABASE_URL points at a throwaway database with migrations through
 * 0061; never the app's own database. Run:
 *   TEST_DATABASE_URL=postgres://... node --conditions=react-server --import tsx --test --test-concurrency=1 tests/company-own-tests-db.test.ts
 */
const url = process.env.TEST_DATABASE_URL?.trim();
const skip = !url
  ? "TEST_DATABASE_URL is not set"
  : url === process.env.DATABASE_URL?.trim() || url === process.env.DATABASE_MIGRATE_URL?.trim()
    ? "TEST_DATABASE_URL is the app's own database; refusing"
    : false;

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

describe("company-written tests against a real database", { skip }, () => {
  const client = new Client(connectionOptions(url ?? ""));
  const run = randomUUID().slice(0, 8);
  let sql: Db;
  let mine = "";
  let theirs = "";
  let own: typeof import("../src/lib/company/company-test-data");
  let assessments: typeof import("../src/lib/company/assessment-data");
  let catalog: typeof import("../src/lib/company/catalog-data");
  const content: AssessmentContent = {
    role: "Backend engineer", minutes: 60, submission: "written", toolsAllowed: [], toolsNotAllowed: [],
    instructions: "Write it up.", taskTitle: "Task", taskBrief: "Design it.", sampleTitle: "Practice", sampleBrief: "Try this.",
    rubric: [{ title: "API", skill: "APIs", points: 4, guide: "Clear endpoints." }], results: "none",
  };
  async function created(companyId: string, title = "Backend take-home") {
    const slug = await own.createTest(sql, { companyId, title, role: "Backend engineer", by: "rec@test.invalid" });
    assert.ok(slug);
    return slug;
  }

  before(async () => {
    own = await import("../src/lib/company/company-test-data");
    assessments = await import("../src/lib/company/assessment-data");
    catalog = await import("../src/lib/company/catalog-data");
    await client.connect();
    sql = adapter(client);
    const co = async (n: string) => (await client.query(`insert into course.companies (slug, name, seat_count) values ($1, $1, 5) returning id`, [`${n}-${run}`])).rows[0].id as string;
    mine = await co("own");
    theirs = await co("other");
  });

  // Versions are append-only and an owned item keeps its company, so this run's rows stay in the throwaway database.
  after(async () => {
    await client.end();
  });

  test("a new test starts with a draft at revision 1, and only its company sees it", async () => {
    const slug = await created(mine);
    assert.match(slug, /^t-[a-z0-9]{10}$/);
    const draft = await assessments.loadDraft(sql, slug);
    assert.equal(draft?.revision, 1);
    assert.equal(draft?.role, "Backend engineer");
    assert.deepEqual(await own.ownTest(sql, mine, slug), { title: "Backend take-home" });
    assert.equal(await own.ownTest(sql, theirs, slug), undefined, "another company: not found");
    const ours = await catalog.companyCatalog(sql, mine);
    const other = await catalog.companyCatalog(sql, theirs);
    assert.ok(ours?.some((e) => e.item.slug === slug && e.own && e.item.title === "Backend take-home"));
    assert.ok(!other?.some((e) => e.item.slug === slug), "never in another company's list");
    const klymb = await catalog.loadCatalog(sql);
    assert.ok(!klymb?.has(slug), "never in Klymb's catalog");
  });

  test("saving needs the revision the editor opened, and the right company", async () => {
    const slug = await created(mine);
    const save = (companyId: string, expected: number, title = "Renamed") => own.saveOwnDraft(sql, { companyId, slug, title, content, expected, by: "rec@test.invalid" });
    assert.deepEqual(await save(theirs, 1), { status: "changed" }, "another company changes nothing");
    assert.deepEqual(await save(mine, 1), { status: "saved", revision: 2 });
    assert.deepEqual(await save(mine, 1), { status: "changed" }, "a stale editor");
    assert.deepEqual(await own.ownTest(sql, mine, slug), { title: "Renamed" });
    assert.equal((await assessments.loadDraft(sql, slug))?.taskBrief, "Design it.");
  });

  test("publishing makes the next version, approved for this company only, and twice publishes once", async () => {
    const slug = await created(mine);
    await own.saveOwnDraft(sql, { companyId: mine, slug, title: "Take-home", content, expected: 1, by: "rec@test.invalid" });
    assert.deepEqual(await own.publishOwnDraft(sql, { companyId: theirs, slug, revision: 2, by: "x@test.invalid" }), { status: "changed" }, "not theirs to publish");
    const [a, b] = await Promise.all([
      own.publishOwnDraft(sql, { companyId: mine, slug, revision: 2, by: "rec@test.invalid" }),
      own.publishOwnDraft(sql, { companyId: mine, slug, revision: 2, by: "rec@test.invalid" }),
    ]);
    const outcomes = [a, b].map((o) => o?.status).sort();
    assert.ok(outcomes[0] === "changed" || outcomes[1] === "published", JSON.stringify([a, b]));
    const versions = await assessments.loadVersions(sql, slug);
    assert.equal(versions?.length, 1, "one version");
    assert.equal(versions?.[0].title, "Take-home");
    const standing = (await assessments.companyStandings(sql, mine, [slug]))?.get(slug);
    assert.equal(standing?.inUse?.version, 1, "usable at once");
    const approvals = (await client.query(`select company_id from course.company_assessment_reviews where version_id = $1`, [versions![0].id])).rows;
    assert.deepEqual(approvals.map((r) => r.company_id), [mine]);
    // The company's reviewer can't decline it through Klymb's approval path.
    const declined = await assessments.setReview(sql, { companyId: mine, slug, versionId: versions![0].id, decision: "declined", note: "no", by: "r@test.invalid" });
    assert.equal(declined, false);
  });

  test("the database refuses to grant a company's test to anyone, or to give it to a course", async () => {
    const slug = await created(mine);
    await assert.rejects(client.query(`insert into course.company_catalog_grants (company_id, item_slug, granted_by) values ($1, $2, 'k@test.invalid')`, [theirs, slug]), /not granted/);
    await assert.rejects(client.query(`update course.catalog_items set kind = 'course' where slug = $1`, [slug]), /catalog_items_owned_assessment/);
    await assert.rejects(client.query(`update course.catalog_items set title = null where slug = $1`, [slug]), /catalog_items_own_words/);
  });

  test("a draft with several questions, multiple choice included, publishes with its questions frozen (L2)", async () => {
    const slug = await created(mine);
    const questions = [
      { section: "Part A", title: "Load", brief: "Load the data.", submission: "written" as const, rubric: [{ title: "Checks", skill: "Data", points: 3, guide: "g" }] },
      { section: "Part B", title: "Pick", brief: "Which is a join?", submission: "written" as const, rubric: [],
        mcq: { options: [{ text: "LEFT", correct: true }, { text: "SUM", correct: false }], points: 2, partial: false }, source: "00000000-0000-4000-8000-000000000001" },
    ];
    const multi: AssessmentContent = { ...content, taskTitle: "", taskBrief: "", rubric: [], submission: "written", questions };
    assert.deepEqual(await own.saveOwnDraft(sql, { companyId: mine, slug, title: "Two parts", content: multi, expected: 1, by: "rec@test.invalid" }), { status: "saved", revision: 2 });
    assert.deepEqual((await assessments.loadDraft(sql, slug))?.questions, questions);
    assert.equal((await own.publishOwnDraft(sql, { companyId: mine, slug, revision: 2, by: "rec@test.invalid" }))?.status, "published");
    const [v] = (await assessments.loadVersions(sql, slug)) ?? [];
    assert.deepEqual(v?.questions, questions, "frozen with the version, right options included (never sent to candidates)");
    assert.equal(v?.taskTitle, "");
    assert.deepEqual(v?.rubric, []);
    // A one-task version still needs its task and rubric.
    await assert.rejects(client.query(`update course.assessment_drafts set questions = '[]'::jsonb where slug = $1`, [slug]), /assessment_drafts_questions/);
    await assert.rejects(
      client.query(`insert into course.assessment_versions (slug, version, draft_revision, title, role, minutes, submission, tools_allowed, tools_not_allowed, instructions, task_title, task_brief, sample_title, sample_brief, rubric, results, published_by)
                    values ($1, 9, 9, 't', 'r', 30, 'written', '{}', '{}', 'i', '', 'b', 's', 'sb', '[]', 'none', 'x')`, [slug]),
      /assessment_versions_task_title|assessment_versions_rubric/,
    );
  });

  test("Klymb's own drafts take questions too, and publish them", async () => {
    const slug = `klymb-q-${run}`;
    const code = { kind: "assessment", slug, title: "Klymb Q", suggestedSkills: [], suggestedPurposes: ["hiring"] } as unknown as import("../src/data/business-catalog").CatalogAssessment;
    const multi: AssessmentContent = { ...content, taskTitle: "", taskBrief: "", rubric: [], questions: [
      { section: "A", title: "One", brief: "b", submission: "written", rubric: [{ title: "X", skill: "s", points: 1, guide: "g" }] },
    ] };
    assert.deepEqual(await assessments.saveDraft(sql, code, multi, 0, "k@test.invalid"), { status: "saved", revision: 1 });
    assert.equal((await assessments.loadDraft(sql, slug))?.questions?.[0].section, "A");
    assert.deepEqual(await assessments.publishDraft(sql, slug, "Klymb Q", 1, "k@test.invalid"), { status: "published", version: 1 });
    assert.equal((await assessments.loadVersions(sql, slug))?.[0].questions?.[0].title, "One");
  });

  test("P0.4: one Create press makes one test, even pressed twice at once or retried; keys are per company", async () => {
    const key = randomUUID();
    const t = { companyId: mine, title: "Auto screen", role: "Backend developer", by: "rec@test.invalid", createKey: key };
    const [a, b] = await Promise.all([own.createTestKeyed(sql, t), own.createTestKeyed(sql, t)]);
    assert.ok(a && b);
    assert.equal(a.slug, b.slug, "the same test");
    assert.deepEqual([a.existed, b.existed].sort(), [false, true]);
    const again = await own.createTestKeyed(sql, t);
    assert.deepEqual(again, { slug: a.slug, audience: "external", existed: true }, "no audience given means external");
    const other = await own.createTestKeyed(sql, { ...t, companyId: theirs });
    assert.ok(other && other.slug !== a.slug && !other.existed, "another company's same key is its own");
    assert.equal((await client.query(`select count(*)::int n from course.catalog_items where create_key = $1`, [key])).rows[0].n, 2);
    await assert.rejects(client.query(`update course.catalog_items set create_key = 'nope' where slug = $1`, [a.slug]), /catalog_items_create_key/);
  });

  test("P0.4: roles save by revision; companies read active ones only", async () => {
    const roles = await import("../src/lib/company/roles-data");
    const slug = `r-${run}`;
    const base = { slug, label: "Test role", summary: "", skills: ["Java"], status: "hidden" as const, sort: 999, by: "a@test.invalid" };
    assert.deepEqual(await roles.saveRole(sql, { ...base, expected: 0 }), { status: "saved", revision: 1 });
    assert.deepEqual(await roles.saveRole(sql, { ...base, expected: 0 }), { status: "exists" });
    assert.ok(!(await roles.activeRoles(sql))?.some((r) => r.slug === slug), "hidden");
    assert.deepEqual(await roles.saveRole(sql, { ...base, status: "active", expected: 1 }), { status: "saved", revision: 2 });
    assert.deepEqual(await roles.saveRole(sql, { ...base, expected: 1 }), { status: "changed" }, "stale");
    assert.ok((await roles.activeRoles(sql))?.some((r) => r.slug === slug));
    await assert.rejects(client.query(`insert into course.assessment_roles (slug, label, skills, updated_by) values ('Bad Slug', 'x', '{a}', 'x')`), /check/);
    await client.query(`delete from course.assessment_roles where slug = $1`, [slug]);
  });

  test("P0.3: a seed key belongs to Klymb's questions only and is unique", async () => {
    const key = `kb-test-${run}`;
    const ins = (owner: string | null) => client.query(
      `insert into course.library_questions (owner_company_id, type, title, statement, difficulty, points, minutes, options, created_by, updated_by, seed_key)
       values ($1, 'mcq', 't', 's', 'easy', 2, 1, '[{"text":"a","correct":true},{"text":"b","correct":false}]', 'x', 'x', $2)`, [owner, key]);
    await assert.rejects(ins(mine), /library_questions_seed_key/, "never on a company's question");
    await ins(null);
    await assert.rejects(ins(null), /library_questions_seed_key_once|duplicate/);
    await client.query(`delete from course.library_questions where seed_key = $1`, [key]);
  });
});
