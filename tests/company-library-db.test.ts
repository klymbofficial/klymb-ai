import { strict as assert } from "node:assert";
import { randomUUID } from "node:crypto";
import { after, before, describe, test } from "node:test";
import { Client } from "pg";
import { connectionOptions } from "../src/lib/db/connection";
import type { Db, DbError } from "../src/lib/db/client";
import type { QuestionInput } from "../src/lib/company/library-rules";

/**
 * The question library (L1, migration 0063) against a real database.
 * TEST_DATABASE_URL points at a throwaway database with migrations through
 * 0063; never the app's own database. Run:
 *   TEST_DATABASE_URL=postgres://... node --conditions=react-server --import tsx --test --test-concurrency=1 tests/company-library-db.test.ts
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

describe("the question library against a real database", { skip }, () => {
  const client = new Client(connectionOptions(url ?? ""));
  const run = randomUUID().slice(0, 8);
  let sql: Db;
  let mine = "";
  let theirs = "";
  let lib: typeof import("../src/lib/company/library-data");
  const mcq: QuestionInput = {
    type: "mcq", title: `Joins ${run}`, statement: "Which join keeps every row of the left table?", difficulty: "easy", tags: ["SQL"],
    points: 2, minutes: 1, options: [{ text: "Inner", correct: false }, { text: "Left outer", correct: true }], partial: false, rubric: null,
  };
  const written: QuestionInput = {
    type: "written", title: `Design ${run}`, statement: "Design a rate limiter.", difficulty: "medium", tags: ["System design"],
    points: 5, minutes: 30, options: null, partial: false, rubric: [{ title: "Trade-offs", skill: "Design", points: 5, guide: "Names two." }],
  };

  before(async () => {
    lib = await import("../src/lib/company/library-data");
    await client.connect();
    sql = adapter(client);
    const co = async (n: string) => (await client.query(`insert into course.companies (slug, name, seat_count) values ($1, $1, 5) returning id`, [`${n}-${run}`])).rows[0].id as string;
    mine = await co("lib");
    theirs = await co("lib-other");
  });
  after(async () => {
    await client.end();
  });

  test("a company's own question is seen by that company only", async () => {
    const id = await lib.createOwnQuestion(sql, { companyId: mine, q: mcq, by: "rec@test.invalid" });
    assert.ok(id);
    const listed = await lib.ownLibrary(sql, mine);
    assert.ok(listed?.some((q) => q.id === id && q.own && q.status === "published"));
    assert.deepEqual(listed?.find((q) => q.id === id)?.options, mcq.options);
    assert.ok(!(await lib.ownLibrary(sql, theirs))?.some((q) => q.id === id));
    assert.ok(!(await lib.klymbLibrary(sql))?.some((q) => q.id === id));
    assert.equal(await lib.libraryQuestion(sql, theirs, id), undefined);
    assert.equal((await lib.libraryQuestion(sql, mine, id))?.title, mcq.title);
  });

  test("another company can't save or remove it, and a stale revision is refused", async () => {
    const id = (await lib.createOwnQuestion(sql, { companyId: mine, q: mcq, by: "rec@test.invalid" }))!;
    assert.deepEqual(await lib.saveOwnQuestion(sql, { companyId: theirs, id, q: { ...mcq, title: "Taken" }, expected: 1, by: "x@test.invalid" }), { status: "changed" });
    assert.equal(await lib.removeOwnQuestion(sql, { companyId: theirs, id, by: "x@test.invalid" }), false);
    assert.deepEqual(await lib.saveOwnQuestion(sql, { companyId: mine, id, q: written, expected: 1, by: "rec@test.invalid" }), { status: "saved", revision: 2 });
    assert.deepEqual(await lib.saveOwnQuestion(sql, { companyId: mine, id, q: mcq, expected: 1, by: "rec@test.invalid" }), { status: "changed" });
    const now = await lib.libraryQuestion(sql, mine, id);
    assert.equal(now?.type, "written");
    assert.equal(now?.options, null);
    assert.deepEqual(now?.rubric, written.rubric);
    assert.equal(await lib.removeOwnQuestion(sql, { companyId: mine, id, by: "rec@test.invalid" }), true);
    assert.equal(await lib.libraryQuestion(sql, mine, id), undefined);
    assert.ok(!(await lib.ownLibrary(sql, mine))?.some((q) => q.id === id));
  });

  test("Klymb's questions reach companies only once published", async () => {
    const id = (await lib.createKlymbQuestion(sql, { q: { ...written, title: `Klymb ${run}` }, status: "draft", by: "admin@test.invalid" }))!;
    assert.ok(!(await lib.klymbLibrary(sql))?.some((q) => q.id === id));
    assert.equal(await lib.libraryQuestion(sql, mine, id), undefined);
    assert.ok((await lib.adminLibrary(sql))?.some((q) => q.id === id && q.status === "draft"));
    // A company's save path can't touch Klymb's question.
    assert.deepEqual(await lib.saveOwnQuestion(sql, { companyId: mine, id, q: mcq, expected: 1, by: "rec@test.invalid" }), { status: "changed" });
    assert.deepEqual(await lib.saveKlymbQuestion(sql, { id, q: { ...written, title: `Klymb ${run}` }, status: "published", expected: 1, by: "admin@test.invalid" }), { status: "saved", revision: 2 });
    assert.ok((await lib.klymbLibrary(sql))?.some((q) => q.id === id && !q.own));
    assert.equal((await lib.libraryQuestion(sql, theirs, id))?.id, id);
    // The admin path can't touch a company's question.
    const owned = (await lib.createOwnQuestion(sql, { companyId: mine, q: mcq, by: "rec@test.invalid" }))!;
    assert.equal(await lib.adminQuestion(sql, owned), undefined);
    assert.deepEqual(await lib.saveKlymbQuestion(sql, { id: owned, q: mcq, status: "retired", expected: 1, by: "admin@test.invalid" }), { status: "changed" });
  });

  test("the table refuses options on a written question and a multiple-choice question without them", async () => {
    const bad = async (sqlText: string) => {
      await assert.rejects(client.query(sqlText), (e: { code?: string }) => e.code === "23514");
    };
    await bad(`insert into course.library_questions (type, title, statement, difficulty, points, minutes, options, rubric, created_by, updated_by)
               values ('written', 't', 's', 'easy', 1, 1, '[{"text":"a"},{"text":"b"}]', '[{"title":"a"}]', 'x', 'x')`);
    await bad(`insert into course.library_questions (type, title, statement, difficulty, points, minutes, created_by, updated_by)
               values ('mcq', 't', 's', 'easy', 1, 1, 'x', 'x')`);
    await bad(`insert into course.library_questions (type, title, statement, difficulty, points, minutes, options, partial, rubric, created_by, updated_by)
               values ('written', 't', 's', 'easy', 1, 1, null, true, '[{"title":"a"}]', 'x', 'x')`);
    await bad(`insert into course.library_questions (type, title, statement, difficulty, points, minutes, options, created_by, updated_by)
               values ('mcq', 't', 's', 'easy', 1, 1, '[{"text":"a"}]', 'x', 'x')`);
  });

  test("a malformed id reads as not found, not an error", async () => {
    assert.equal(await lib.libraryQuestion(sql, mine, "not-a-uuid"), undefined);
    assert.equal(await lib.adminQuestion(sql, "x'; drop"), undefined);
  });
});
