import { strict as assert } from "node:assert";
import { randomUUID } from "node:crypto";
import { after, before, describe, test } from "node:test";
import { Client } from "pg";
import { connectionOptions } from "../src/lib/db/connection";
import type { Db, DbError } from "../src/lib/db/client";
import type { CatalogAssessment } from "../src/data/business-catalog";
import type { AssessmentContent } from "../src/lib/company/assessment-rules";
import type { BatchInput } from "../src/lib/company/batch-rules";

/**
 * H06 against a real database. Opt-in, like company-batch-db: runs only when
 * TEST_DATABASE_URL points at a throwaway database with migrations through
 * 0053, and refuses the app's own database:
 *
 *   TEST_DATABASE_URL=postgres://... node --conditions=react-server --import tsx --test --test-concurrency=1 tests/company-attempt-db.test.ts
 *
 * One file at a time (--test-concurrency=1) when running both hiring DB
 * suites: the automatic reminder claims everyone due in the whole database,
 * as the daily job does, so a parallel file's people would be claimed too.
 *
 * Nothing is emailed: it calls the data functions directly.
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

describe("candidate attempts against a real database", { skip }, () => {
  const one = new Client(connectionOptions(url ?? ""));
  const two = new Client(connectionOptions(url ?? ""));
  const run = randomUUID().slice(0, 8);
  const slug = `att-${run}`;
  const reviewer = `rev-${run}@test.invalid`;
  const hour = 3600000;
  let companyId = "";
  let versionId = "";
  let sqlA: Db;
  let sqlB: Db;
  let data: typeof import("../src/lib/company/batch-data");
  let att: typeof import("../src/lib/company/attempt-data");
  /** An attempt that started `minutesAgo` minutes ago with `allowed` minutes, put straight in (the app can't start one in the past). */
  async function pastAttempt(minutesAgo: number, allowed: number) {
    const { batchId, id } = await invited();
    const row = (await one.query(
      `insert into course.candidate_attempts (company_id, batch_id, candidate_id, version_id, allowed_minutes, started_at, deadline_at, started_link_generation)
       values ($1, $2, $3, $4, $5, now() - make_interval(mins => $6), now() - make_interval(mins => $6) + make_interval(mins => $5), 1) returning id`,
      [companyId, batchId, id, versionId, allowed, minutesAgo],
    )).rows[0];
    return { batchId, id, attemptId: row.id as string };
  }

  const code = { kind: "assessment", slug, title: "Attempt practical", suggestedSkills: ["APIs"], suggestedPurposes: ["hiring"] } as unknown as CatalogAssessment;
  const content: AssessmentContent = {
    role: "Backend engineer", minutes: 60, submission: "written", toolsAllowed: ["Docs"], toolsNotAllowed: [],
    instructions: "Write it up.", taskTitle: "Task", taskBrief: "Design it.", sampleTitle: "Practice", sampleBrief: "Try this.",
    rubric: [{ title: "API", skill: "APIs", points: 4, guide: "Clear endpoints." }], results: "none",
  };
  const input = (over: Partial<BatchInput> = {}): BatchInput & { companyId: string; requestKey: string; by: string } => ({
    item: slug, versionId, role: "Backend engineer", prepCourse: null, reviewer, timeZone: "UTC",
    opensAt: new Date(Date.now() - hour), closesAt: new Date(Date.now() + 48 * hour),
    candidates: [{ name: "Asha", email: `asha-${run}-${randomUUID().slice(0, 4)}@test.invalid`, extraMinutes: 15 }],
    companyId, requestKey: randomUUID(), by: "rec@test.invalid", ...over,
  });
  /** A sent batch with one person whose invitation went out; returns their id. */
  async function invited(over: Partial<BatchInput> = {}) {
    const made = await data.createBatch(sqlA, input(over));
    const batchId = (made as { id: string }).id;
    const [t] = (await data.startSending(sqlA, companyId, batchId, "rec"))!;
    await data.recordMail(sqlA, { candidateId: t.id, kind: "invite", generation: 1, outcome: "sent", error: null, by: "rec" });
    return { batchId, id: t.id };
  }
  const events = async (id: string) =>
    (await one.query(`select kind from course.hiring_events where candidate_id = $1`, [id])).rows.map((r) => r.kind as string).sort();
  // node-postgres hands back Date objects where the app's client gives strings: compare instants.
  const ms = (t: string | Date | null | undefined) => (t ? new Date(t).getTime() : NaN);

  before(async () => {
    const assessments = await import("../src/lib/company/assessment-data");
    data = await import("../src/lib/company/batch-data");
    att = await import("../src/lib/company/attempt-data");
    await one.connect();
    await two.connect();
    sqlA = adapter(one);
    sqlB = adapter(two);
    companyId = (await one.query(`insert into course.companies (slug, name, seat_count) values ($1, 'Attempt test', 5) returning id`, [`att-${run}`])).rows[0].id;
    await one.query(`insert into course.company_members (email, company_id, role, name) values ($1, $2, 'employee', 'Rev')`, [reviewer, companyId]);
    await one.query(`insert into course.company_member_roles (company_id, email, role) values ($1, $2, 'reviewer')`, [companyId, reviewer]);
    await assessments.saveDraft(sqlA, code, content, 0, "a@test.invalid");
    await assessments.publishDraft(sqlA, slug, "Attempt practical", 1, "a@test.invalid");
    versionId = (await assessments.loadVersions(sqlA, slug))![0].id;
    await one.query(`insert into course.company_assessment_reviews (company_id, version_id, decision, decided_by) values ($1, $2, 'approved', $3)`, [companyId, versionId, reviewer]);
  });

  after(async () => {
    if (companyId) await one.query(`delete from course.companies where id = $1`, [companyId]);
    await one.query(`delete from course.assessment_drafts where slug = $1`, [slug]);
    await one.end();
    await two.end();
  });

  test("two presses of Start at once make one attempt, with the deadline the server set", async () => {
    const { id } = await invited();
    const before = Date.now();
    const [x, y] = await Promise.all([att.startAttempt(sqlA, id, 1), att.startAttempt(sqlB, id, 1)]);
    assert.ok(x && y && x.status !== "refused" && y.status !== "refused");
    assert.deepEqual([x.status, y.status].sort(), ["resumed", "started"]);
    assert.equal(x.attempt.id, y.attempt.id, "the same attempt");
    assert.equal(x.attempt.allowedMinutes, 75, "60 minutes plus 15 extra");
    const span = new Date(x.attempt.deadlineAt).getTime() - new Date(x.attempt.startedAt).getTime();
    assert.equal(span, 75 * 60000);
    assert.ok(new Date(x.attempt.startedAt).getTime() >= before - 5000, "started now, by the database's clock");
    const count = (await one.query(`select count(*)::int n from course.candidate_attempts where candidate_id = $1`, [id])).rows[0].n;
    assert.equal(count, 1);
    assert.deepEqual(await events(id), ["attempt_resumed", "attempt_started"], "one start, one resume");
  });

  test("pressing Start again later resumes with the same clock, and logs the resume once per link", async () => {
    const { id } = await invited();
    const first = await att.startAttempt(sqlA, id, 1);
    const again = await att.startAttempt(sqlA, id, 1);
    const third = await att.startAttempt(sqlA, id, 1);
    assert.ok(first && again && third && first.status === "started" && again.status === "resumed" && third.status === "resumed");
    assert.equal(ms(again.attempt.deadlineAt), ms(first.attempt.deadlineAt));
    assert.deepEqual(await events(id), ["attempt_resumed", "attempt_started"]);
  });

  test("a replaced link can't start or continue; the new link continues the same attempt", async () => {
    const { batchId, id } = await invited();
    const first = await att.startAttempt(sqlA, id, 1);
    assert.ok(first && first.status === "started");
    const t = await data.claimChange(sqlA, companyId, batchId, id, { kind: "new_link" });
    assert.ok(t && t !== "taken" && t.generation === 2);
    assert.deepEqual(await att.startAttempt(sqlA, id, 1), { status: "refused" }, "the old link");
    assert.equal(await att.attemptByLink(sqlA, id, 1), undefined, "the old link can't read it either");
    const fromNew = await att.startAttempt(sqlA, id, 2);
    assert.ok(fromNew && fromNew.status === "resumed");
    assert.equal(fromNew.attempt.id, first.attempt.id);
    assert.equal(ms(fromNew.attempt.deadlineAt), ms(first.attempt.deadlineAt), "a new link is not a new clock");
    assert.deepEqual(await events(id), ["attempt_resumed", "attempt_started"], "resumed from the new link, logged once");
  });

  test("a later extension doesn't move a running clock, and the database refuses a moved deadline", async () => {
    const { batchId, id } = await invited();
    const first = await att.startAttempt(sqlA, id, 1);
    assert.ok(first && first.status === "started");
    await data.claimChange(sqlA, companyId, batchId, id, { kind: "extension", extraMinutes: 120, lastStartAt: new Date(Date.now() + 72 * hour) });
    const again = await att.attemptByLink(sqlA, id, 1);
    assert.equal(ms(again?.deadlineAt), ms(first.attempt.deadlineAt));
    assert.equal(again?.allowedMinutes, 75);
    await assert.rejects(one.query(`update course.candidate_attempts set deadline_at = deadline_at + interval '1 hour' where id = $1`, [first.attempt.id]), /cannot be changed|violates check/);
  });

  test("Start is refused before opening, after the last start, when cancelled, and when the batch is cancelled", async () => {
    const early = await invited({ opensAt: new Date(Date.now() + 2 * hour) });
    assert.deepEqual(await att.startAttempt(sqlA, early.id, 1), { status: "refused" }, "not open yet");

    const late = await invited();
    await one.query(`update course.batch_candidates set last_start_at = now() - interval '1 minute' where id = $1`, [late.id]);
    assert.deepEqual(await att.startAttempt(sqlA, late.id, 1), { status: "refused" }, "last start passed");

    const gone = await invited();
    await data.cancelCandidate(sqlA, companyId, gone.batchId, gone.id, "rec");
    assert.deepEqual(await att.startAttempt(sqlA, gone.id, 1), { status: "refused" }, "cancelled person");

    const batchGone = await invited();
    await data.cancelBatch(sqlA, companyId, batchGone.batchId, "rec");
    assert.deepEqual(await att.startAttempt(sqlA, batchGone.id, 1), { status: "refused" }, "cancelled batch");

    assert.deepEqual(await att.startAttempt(sqlA, randomUUID(), 1), { status: "refused" }, "nobody");
  });

  test("someone who started isn't reminded or re-invited, and a cancelled invitation can't continue", async () => {
    const { batchId, id } = await invited();
    const started = await att.startAttempt(sqlA, id, 1);
    assert.ok(started && started.status === "started");
    assert.deepEqual((await data.claimReminders(sqlA, companyId, batchId, null))!.map((t) => t.id), [], "a manual reminder skips them");
    // Their last start within a day, so the automatic reminder would pick them if they hadn't started.
    await one.query(`update course.batch_candidates set last_start_at = now() + interval '2 hours' where id = $1`, [id]);
    assert.ok(!(await data.claimAutoReminders(sqlA))!.some((t) => t.id === id), "the automatic one too");
    await one.query(`update course.batch_candidates set delivery = 'failed', delivery_error = 'test' where id = $1`, [id]);
    assert.deepEqual(await data.claimRetry(sqlA, companyId, batchId, null), [], "and their invitation isn't resent");
    await data.cancelCandidate(sqlA, companyId, batchId, id, "rec");
    assert.deepEqual(await att.startAttempt(sqlA, id, 1), { status: "refused" }, "a cancelled invitation can't continue");
  });

  test("answers save on top of the latest save only; an older tab gets a conflict", async () => {
    const { id } = await invited();
    const started = await att.startAttempt(sqlA, id, 1);
    assert.ok(started && started.status === "started");
    const attemptId = started.attempt.id;
    const save = (base: number, answer: string, sql = sqlA) => att.saveDraft(sql, { candidateId: id, generation: 1, attemptId, baseRevision: base, answer });

    assert.equal((await save(0, "first"))?.status, "saved");
    const second = await save(1, "second");
    assert.ok(second && second.status === "saved" && second.revision === 2);
    assert.deepEqual(await save(1, "stale tab"), { status: "conflict", revision: 2 }, "an older tab can't overwrite");
    assert.deepEqual(await save(0, "another first"), { status: "conflict", revision: 2 });
    const [x, y] = await Promise.all([save(2, "tab A", sqlA), save(2, "tab B", sqlB)]);
    assert.deepEqual([x?.status, y?.status].sort(), ["conflict", "saved"], "two saves at once: one lands");
    const kept = await att.loadDraft(sqlA, attemptId);
    assert.equal(kept?.revision, 3);
    assert.ok(kept?.answer === "tab A" || kept?.answer === "tab B");
    assert.equal(await save(3, "x".repeat(60001)), null, "the database refuses an over-long answer");
    assert.equal((await att.loadDraft(sqlA, attemptId))?.revision, 3, "and keeps the last good one");
  });

  test("saves stop after the deadline's grace, after a submit, and for a replaced or cancelled link", async () => {
    const graced = await pastAttempt(60, 60);
    await one.query(`update course.candidate_attempts set submitted_at = null where id = $1`, [graced.attemptId]);
    const inGrace = await att.saveDraft(sqlA, { candidateId: graced.id, generation: 1, attemptId: graced.attemptId, baseRevision: 0, answer: "just in time" });
    assert.equal(inGrace?.status, "saved", "the deadline passed moments ago: inside the grace");

    const over = await pastAttempt(61, 60);
    assert.deepEqual(await att.saveDraft(sqlA, { candidateId: over.id, generation: 1, attemptId: over.attemptId, baseRevision: 0, answer: "late" }), { status: "closed" });

    const { batchId, id } = await invited();
    const started = await att.startAttempt(sqlA, id, 1);
    assert.ok(started && started.status === "started");
    const attemptId = started.attempt.id;
    await one.query(`update course.candidate_attempts set submitted_at = now(), submit_kind = 'candidate' where id = $1`, [attemptId]);
    assert.deepEqual(await att.saveDraft(sqlA, { candidateId: id, generation: 1, attemptId, baseRevision: 0, answer: "after" }), { status: "closed" }, "submitted");

    const other = await invited();
    const run2 = await att.startAttempt(sqlA, other.id, 1);
    assert.ok(run2 && run2.status === "started");
    await data.claimChange(sqlA, companyId, other.batchId, other.id, { kind: "new_link" });
    assert.deepEqual(await att.saveDraft(sqlA, { candidateId: other.id, generation: 1, attemptId: run2.attempt.id, baseRevision: 0, answer: "old link" }), { status: "refused" });
    assert.equal((await att.saveDraft(sqlA, { candidateId: other.id, generation: 2, attemptId: run2.attempt.id, baseRevision: 0, answer: "new link" }))?.status, "saved");
    await data.cancelCandidate(sqlA, companyId, other.batchId, other.id, "rec");
    assert.deepEqual(await att.saveDraft(sqlA, { candidateId: other.id, generation: 2, attemptId: run2.attempt.id, baseRevision: 1, answer: "cancelled" }), { status: "refused" });
    assert.deepEqual(await att.saveDraft(sqlA, { candidateId: randomUUID(), generation: 1, attemptId, baseRevision: 0, answer: "someone else" }), { status: "refused" });
    void batchId;
  });

  test("files: three at most even when uploads race, no duplicates, removable until closed, and fixed once submitted", async () => {
    const { batchId, id } = await invited();
    const started = await att.startAttempt(sqlA, id, 1);
    assert.ok(started && started.status === "started");
    const attemptId = started.attempt.id;
    const sha = (n: number) => n.toString(16).padStart(64, "0");
    const add = (n: number, sql = sqlA, generation = 1) => att.addAttemptFile(sql, {
      candidateId: id, generation, attemptId, name: `f${n}.pdf`, kind: "pdf", bytes: 1000 + n, sha256: sha(n),
      storageKey: `attempt-files/${companyId}/${attemptId}/${sha(n)}.pdf`,
    });
    assert.deepEqual(await att.fileSlot(sqlA, { candidateId: id, generation: 1, attemptId }), { status: "open", companyId, count: 0 });
    const first = await add(1);
    assert.ok(first && first.status === "added");
    assert.deepEqual(await add(1), { status: "duplicate" }, "the same bytes twice");
    // Two more and a fourth at once, from two connections: only two land.
    const racing = await Promise.all([add(2, sqlA), add(3, sqlB), add(4, sqlA), add(5, sqlB)]);
    const landed = racing.filter((r) => r?.status === "added").length;
    assert.ok(landed <= 2, `at most two more landed, got ${landed}`);
    while ((await att.listAttemptFiles(sqlA, attemptId))!.length < 3) await add(10 + Math.floor(Math.random() * 1000));
    const listed = await att.listAttemptFiles(sqlA, attemptId);
    assert.equal(listed!.length, 3, "never more than three");
    assert.deepEqual(await add(99), { status: "full" });

    assert.equal(await att.removeAttemptFile(sqlA, { candidateId: id, generation: 1, attemptId, fileId: listed![0].id }), true);
    assert.equal((await add(99))?.status, "added", "removing frees a slot");
    assert.equal(await att.removeAttemptFile(sqlA, { candidateId: id, generation: 2, attemptId, fileId: listed![1].id }), false, "not through a link that isn't current");
    assert.deepEqual(await add(200, sqlA, 2), { status: "refused" });

    // H08 will do this on submit; here, by hand: a submitted file can't change or be removed by the candidate.
    await one.query(`update course.attempt_files set stage = 'submitted' where attempt_id = $1`, [attemptId]);
    await assert.rejects(one.query(`update course.attempt_files set name = 'x' where attempt_id = $1`, [attemptId]), /cannot be changed/);
    assert.equal(await att.removeAttemptFile(sqlA, { candidateId: id, generation: 1, attemptId, fileId: listed![1].id }), false);

    const over = await pastAttempt(61, 60);
    assert.deepEqual(await att.fileSlot(sqlA, { candidateId: over.id, generation: 1, attemptId: over.attemptId }), { status: "closed" });
    assert.deepEqual(await att.addAttemptFile(sqlA, {
      candidateId: over.id, generation: 1, attemptId: over.attemptId, name: "late.pdf", kind: "pdf", bytes: 10, sha256: sha(7),
      storageKey: `attempt-files/${companyId}/${over.attemptId}/${sha(7)}.pdf`,
    }), { status: "closed" });
    await assert.rejects(one.query(
      `insert into course.attempt_files (company_id, attempt_id, slot, name, kind, bytes, sha256, storage_key) values ($1, $2, 1, 'big.pdf', 'pdf', 4194305, $3, 'k')`,
      [companyId, over.attemptId, sha(8)],
    ), /attempt_files_bytes/, "the database refuses more than 4 MB");
    void batchId;
  });

  test("the first open of each link is noted once; another company sees no attempts", async () => {
    const { batchId, id } = await invited();
    await att.recordLinkOpened(sqlA, id, 1);
    await att.recordLinkOpened(sqlA, id, 1);
    await att.recordLinkOpened(sqlA, id, 9);
    assert.deepEqual(await events(id), ["link_opened"], "once, and not for a generation that doesn't exist");
    await att.startAttempt(sqlA, id, 1);
    assert.equal((await att.attemptsForBatch(sqlA, companyId, batchId))!.length, 1);
    assert.deepEqual(await att.attemptsForBatch(sqlA, randomUUID(), batchId), []);
    await assert.rejects(one.query(`update course.hiring_events set kind = 'submitted' where candidate_id = $1`, [id]), /append-only/);
  });
});
