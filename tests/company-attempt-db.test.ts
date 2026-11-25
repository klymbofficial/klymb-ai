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
 * H06–H09 against a real database. Opt-in, like company-batch-db: runs only when
 * TEST_DATABASE_URL points at a throwaway database with migrations through
 * 0060, and refuses the app's own database:
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
  let rev: typeof import("../src/lib/company/review-data");
  let dec: typeof import("../src/lib/company/decision-data");
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
    rev = await import("../src/lib/company/review-data");
    dec = await import("../src/lib/company/decision-data");
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
    await one.query(`delete from course.assessment_drafts where slug = any($1)`, [[slug, `${slug}-area`]]);
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
    assert.deepEqual(await att.saveDraft(sqlA, { candidateId: id, generation: 1, attemptId, baseRevision: 0, answer: "after" }), { status: "submitted" });

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

  /** A started attempt with a saved answer (revision 1). */
  async function startedWith(answer: string) {
    const { batchId, id } = await invited();
    const started = await att.startAttempt(sqlA, id, 1);
    assert.ok(started && started.status === "started");
    const attemptId = started.attempt.id;
    assert.equal((await att.saveDraft(sqlA, { candidateId: id, generation: 1, attemptId, baseRevision: 0, answer }))?.status, "saved");
    return { batchId, id, attemptId };
  }
  const sha = (n: number) => n.toString(16).padStart(64, "0");
  const fileFor = (id: string, attemptId: string, n: number) => ({
    candidateId: id, generation: 1, attemptId, name: `f${n}.pdf`, kind: "pdf" as const, bytes: 1000 + n, sha256: sha(n),
    storageKey: `attempt-files/${companyId}/${attemptId}/${sha(n)}.pdf`,
  });
  const submissionOf = async (attemptId: string) =>
    (await one.query(`select answer, draft_revision, file_ids, kind from course.attempt_submissions where attempt_id = $1`, [attemptId])).rows;

  test("Submit freezes the saved answer and files once; a second press or tab gets the same receipt", async () => {
    const { id, attemptId } = await startedWith("my final answer");
    assert.equal((await att.addAttemptFile(sqlA, fileFor(id, attemptId, 1)))?.status, "added");
    assert.equal((await att.addAttemptFile(sqlA, fileFor(id, attemptId, 2)))?.status, "added");

    const who = { candidateId: id, generation: 1, attemptId, revision: 1 };
    const [x, y] = await Promise.all([att.submitAttempt(sqlA, who), att.submitAttempt(sqlB, who)]);
    assert.ok(x && y && "receipt" in x && "receipt" in y);
    assert.deepEqual([x.status, y.status].sort(), ["already", "submitted"]);
    assert.equal(x.receipt, y.receipt, "one receipt");
    assert.equal(x.kind, "candidate");
    assert.deepEqual(await att.submitAttempt(sqlA, who), { ...x, status: "already" }, "a later press: the same receipt");

    const rows = await submissionOf(attemptId);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].answer, "my final answer");
    assert.equal(rows[0].draft_revision, 1);
    assert.equal(rows[0].file_ids.length, 2);
    assert.equal(rows[0].kind, "candidate");
    const stages = (await one.query(`select stage from course.attempt_files where attempt_id = $1`, [attemptId])).rows.map((r) => r.stage);
    assert.deepEqual(stages, ["submitted", "submitted"]);
    assert.deepEqual((await events(id)).filter((k) => k.includes("submit")), ["submitted"], "recorded once");
    const sub = await att.loadSubmission(sqlA, attemptId);
    assert.equal(sub?.answer, "my final answer");
    assert.deepEqual(sub?.files.map((f) => f.name), ["f1.pdf", "f2.pdf"]);

    // Nothing changes after: not through the app, and not by hand either.
    assert.deepEqual(await att.saveDraft(sqlA, { candidateId: id, generation: 1, attemptId, baseRevision: 1, answer: "edited" }), { status: "submitted" });
    assert.deepEqual(await att.addAttemptFile(sqlA, fileFor(id, attemptId, 3)), { status: "submitted" });
    assert.deepEqual(await att.fileSlot(sqlA, { candidateId: id, generation: 1, attemptId }), { status: "submitted" });
    const fileId = rows[0].file_ids[0];
    assert.equal(await att.removeAttemptFile(sqlA, { candidateId: id, generation: 1, attemptId, fileId }), false);
    await assert.rejects(one.query(`update course.attempt_submissions set answer = 'x' where attempt_id = $1`, [attemptId]), /cannot be changed/);
    await assert.rejects(one.query(`delete from course.attempt_submissions where attempt_id = $1`, [attemptId]), /only with its attempt/);
    await assert.rejects(one.query(`update course.attempt_drafts set answer = 'x' where attempt_id = $1`, [attemptId]), /submitted/);
    await assert.rejects(one.query(`delete from course.attempt_files where attempt_id = $1`, [attemptId]), /submitted/);
    await assert.rejects(one.query(`update course.candidate_attempts set submitted_at = now() where id = $1`, [attemptId]), /cannot be changed/);
    assert.equal((await att.loadSubmission(sqlA, attemptId))?.answer, "my final answer");
  });

  test("Submit is refused for a page showing an older answer, a replaced or cancelled link, and after the grace", async () => {
    const stale = await startedWith("first");
    assert.equal((await att.saveDraft(sqlB, { candidateId: stale.id, generation: 1, attemptId: stale.attemptId, baseRevision: 1, answer: "second, from another tab" }))?.status, "saved");
    assert.deepEqual(await att.submitAttempt(sqlA, { candidateId: stale.id, generation: 1, attemptId: stale.attemptId, revision: 1 }), { status: "stale" });
    assert.equal((await submissionOf(stale.attemptId)).length, 0, "nothing submitted");
    assert.equal((await att.submitAttempt(sqlA, { candidateId: stale.id, generation: 1, attemptId: stale.attemptId, revision: 2 }))?.status, "submitted");

    const moved = await startedWith("x");
    await data.claimChange(sqlA, companyId, moved.batchId, moved.id, { kind: "new_link" });
    assert.deepEqual(await att.submitAttempt(sqlA, { candidateId: moved.id, generation: 1, attemptId: moved.attemptId, revision: 1 }), { status: "refused" });
    assert.deepEqual(await att.submitAttempt(sqlA, { candidateId: randomUUID(), generation: 2, attemptId: moved.attemptId, revision: 1 }), { status: "refused" }, "someone else's attempt");
    await data.cancelCandidate(sqlA, companyId, moved.batchId, moved.id, "rec");
    assert.deepEqual(await att.submitAttempt(sqlA, { candidateId: moved.id, generation: 2, attemptId: moved.attemptId, revision: 1 }), { status: "refused" });

    const late = await pastAttempt(61, 60);
    assert.deepEqual(await att.submitAttempt(sqlA, { candidateId: late.id, generation: 1, attemptId: late.attemptId, revision: 0 }), { status: "closed" });
    const justNow = await pastAttempt(60, 60);
    const inGrace = await att.submitAttempt(sqlA, { candidateId: justNow.id, generation: 1, attemptId: justNow.attemptId, revision: 0 });
    assert.equal(inGrace?.status, "submitted", "pressed as the time ran out: inside the grace");
    assert.ok(inGrace && "submittedAt" in inGrace && Math.abs(ms(inGrace.submittedAt) - Date.now()) < 60000, "by the candidate: when they pressed");
    assert.equal((await submissionOf(justNow.attemptId))[0].answer, "", "nothing was saved: an empty answer");
  });

  test("at the time limit the saved work is submitted automatically, when someone next looks, once", async () => {
    const over = await pastAttempt(61, 60);
    // Saved before the time ran out (the app can't save into the past, so put in by hand).
    await one.query(`insert into course.attempt_drafts (attempt_id, revision, answer) values ($1, 3, 'saved before time')`, [over.attemptId]);
    const graced = await pastAttempt(60, 60);

    const [a, b] = await Promise.all([att.finaliseDue(sqlA, { candidateId: over.id }), att.finaliseDue(sqlB, { companyId, batchId: over.batchId })]);
    assert.equal((a ?? 0) + (b ?? 0), 1, "submitted once between two lookers");
    const rows = await submissionOf(over.attemptId);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].answer, "saved before time");
    assert.equal(rows[0].draft_revision, 3);
    assert.equal(rows[0].kind, "deadline");
    const ev = (await one.query(`select kind, actor_kind from course.hiring_events where attempt_id = $1 and kind like '%submitted'`, [over.attemptId])).rows;
    assert.deepEqual(ev, [{ kind: "auto_submitted", actor_kind: "system" }]);
    const seen = (await att.attemptsForBatch(sqlA, companyId, over.batchId))![0];
    assert.equal(seen.submitKind, "deadline");
    assert.equal(ms(seen.submittedAt), ms(seen.deadlineAt), "submitted at the time limit, not when it was finalised");
    assert.equal(ms((await att.loadSubmission(sqlA, over.attemptId))?.submittedAt), ms(seen.deadlineAt));

    assert.equal(await att.finaliseDue(sqlA, { candidateId: graced.id }), 0, "inside the save grace: not yet");
    assert.equal((await submissionOf(graced.attemptId)).length, 0);

    // Read through the candidate's link, a timed-out attempt arrives submitted.
    const viaLink = await pastAttempt(90, 60);
    const read = await att.attemptByLink(sqlA, viaLink.id, 1);
    assert.equal(read?.submitKind, "deadline");

    // A cancelled invitation's attempt stays as it was.
    const gone = await pastAttempt(90, 60);
    await data.cancelCandidate(sqlA, companyId, gone.batchId, gone.id, "rec");
    assert.equal(await att.finaliseDue(sqlA, { candidateId: gone.id }), 0);
    assert.equal((await submissionOf(gone.attemptId)).length, 0);

    // A started test still running is never touched.
    const running = await startedWith("working");
    assert.equal(await att.finaliseDue(sqlA, { companyId, batchId: running.batchId }), 0);
    assert.equal((await submissionOf(running.attemptId)).length, 0);
  });

  test("a save racing Submit either makes it into the submission or is refused, never lost in between", async () => {
    for (let i = 0; i < 8; i += 1) {
      const { id, attemptId } = await startedWith("before");
      const [saved, submitted] = await Promise.all([
        att.saveDraft(sqlA, { candidateId: id, generation: 1, attemptId, baseRevision: 1, answer: "racing" }),
        // Straight to the function with no revision, so the race isn't settled by "stale".
        two.query(`select status from course.submit_attempt($1, 'candidate', $2, 1, null, 30)`, [attemptId, id]),
      ]);
      assert.equal(submitted.rows[0].status, "submitted");
      const [row] = await submissionOf(attemptId);
      const draft = (await one.query(`select revision, answer from course.attempt_drafts where attempt_id = $1`, [attemptId])).rows[0];
      assert.equal(row.draft_revision, draft.revision, "the draft didn't move after the submission");
      if (saved?.status === "saved") assert.equal(row.answer, "racing", "a save that reported saved is in the submission");
      else {
        assert.equal(saved?.status, "submitted", `otherwise it's told the test is submitted (got ${JSON.stringify(saved)})`);
        assert.equal(row.answer, "before");
      }
    }
  });

  /** A submitted attempt (answer saved, one file), ready to review. */
  async function submitted(answer = "my answer") {
    const x = await startedWith(answer);
    assert.equal((await att.addAttemptFile(sqlA, fileFor(x.id, x.attemptId, 40)))?.status, "added");
    const out = await att.submitAttempt(sqlA, { candidateId: x.id, generation: 1, attemptId: x.attemptId, revision: 1 });
    assert.equal(out?.status, "submitted");
    return x;
  }
  const review = (attemptId: string, over: Partial<Parameters<typeof rev.recordReview>[1]> = {}, sql = sqlA) =>
    rev.recordReview(sql, { companyId, attemptId, reviewer, baseRevision: 0, scores: [{ points: 3, note: "Clear." }], summary: "Solid.", ...over });

  test("a reviewer scores a submission against its pinned rubric; the database computes the total and logs it", async () => {
    const x = await submitted();
    assert.deepEqual(await review(x.attemptId), { status: "recorded", revision: 1, total: 3, max: 4 });
    const row = (await one.query(`select reviewer_email, scores, total, max, summary, version_id from course.attempt_reviews where attempt_id = $1`, [x.attemptId])).rows[0];
    assert.equal(row.reviewer_email, reviewer);
    assert.deepEqual(row.scores, [{ title: "API", points: 3, max: 4, note: "Clear." }], "the criterion's title copied from the pinned rubric");
    assert.equal(row.version_id, versionId);
    const ev = (await one.query(`select actor_kind, actor_email, detail from course.hiring_events where attempt_id = $1 and kind = 'review_completed'`, [x.attemptId])).rows;
    assert.deepEqual(ev, [{ actor_kind: "reviewer", actor_email: reviewer, detail: { revision: 1, total: 3, max: 4 } }]);

    const view = await rev.loadReviewView(sqlA, companyId, x.batchId, x.id);
    assert.equal(view?.submission?.answer, "my answer");
    assert.deepEqual(view?.submission?.files.map((f) => f.name), ["f40.pdf"]);
    assert.equal(view?.rubric[0].guide, "Clear endpoints.", "reviewers see the guide");
    assert.equal(view?.reviews[0].total, 3);
    assert.equal(await rev.loadReviewView(sqlA, randomUUID(), x.batchId, x.id), undefined, "another company sees nothing");
    assert.equal(await rev.loadReviewView(sqlA, companyId, randomUUID(), x.id), undefined, "nor through another batch");
  });

  test("only this company's reviewers, only submitted work, only scores the rubric allows", async () => {
    const running = await startedWith("not yet");
    assert.deepEqual(await review(running.attemptId), { status: "not_submitted" });
    const x = await submitted();
    assert.deepEqual(await review(x.attemptId, { reviewer: "rec@test.invalid" }), { status: "refused" }, "not a member");
    assert.deepEqual(await review(x.attemptId, { companyId: randomUUID() }), { status: "refused" }, "another company");
    for (const scores of [[{ points: 5, note: "" }], [{ points: 2.5, note: "" }], [{ points: -1, note: "" }], [], [{ points: 1, note: "" }, { points: 1, note: "" }], [{ points: 1, note: "x".repeat(1001) }]]) {
      assert.deepEqual(await review(x.attemptId, { scores }), { status: "invalid" }, JSON.stringify(scores).slice(0, 60));
    }
    assert.deepEqual(await review(x.attemptId, { summary: "x".repeat(2001) }), { status: "invalid" });
    // Losing the role ends it at once.
    await one.query(`delete from course.company_member_roles where company_id = $1 and email = $2 and role = 'reviewer'`, [companyId, reviewer]);
    try {
      assert.deepEqual(await review(x.attemptId), { status: "refused" });
    } finally {
      await one.query(`insert into course.company_member_roles (company_id, email, role) values ($1, $2, 'reviewer')`, [companyId, reviewer]);
    }
    assert.equal((await one.query(`select count(*)::int n from course.attempt_reviews where attempt_id = $1`, [x.attemptId])).rows[0].n, 0, "nothing recorded");
  });

  test("two reviewers saving at once: one lands, the other is told; revisions keep the history and can't be edited", async () => {
    const x = await submitted();
    const [p, q] = await Promise.all([review(x.attemptId, {}, sqlA), review(x.attemptId, { scores: [{ points: 1, note: "" }] }, sqlB)]);
    assert.deepEqual([p?.status, q?.status].sort(), ["conflict", "recorded"]);
    assert.deepEqual(await review(x.attemptId), { status: "conflict", revision: 1 }, "an old page");
    assert.equal((await review(x.attemptId, { baseRevision: 1, scores: [{ points: 4, note: "On reflection." }] }))?.status, "recorded");
    const view = await rev.loadReviewView(sqlA, companyId, x.batchId, x.id);
    assert.deepEqual(view?.reviews.map((r) => r.revision), [2, 1], "newest first");
    const latest = (await rev.reviewsForBatch(sqlA, companyId, x.batchId))!;
    assert.deepEqual(latest.map((r) => [r.revision, r.total]), [[2, 4]]);
    assert.deepEqual(await rev.reviewsForBatch(sqlA, randomUUID(), x.batchId), []);
    await assert.rejects(one.query(`update course.attempt_reviews set total = 0 where attempt_id = $1`, [x.attemptId]), /new revision/);
    await assert.rejects(one.query(`delete from course.attempt_reviews where attempt_id = $1`, [x.attemptId]), /only with its attempt/);
  });

  test("a submission's files download only through its own company, batch and candidate, and drafts never", async () => {
    const x = await submitted();
    const fileId = (await submissionOf(x.attemptId))[0].file_ids[0];
    const found = await rev.submittedFile(sqlA, { companyId, batchId: x.batchId, candidateId: x.id, fileId });
    assert.equal(found?.name, "f40.pdf");
    assert.equal(await rev.submittedFile(sqlA, { companyId: randomUUID(), batchId: x.batchId, candidateId: x.id, fileId }), undefined);
    assert.equal(await rev.submittedFile(sqlA, { companyId, batchId: randomUUID(), candidateId: x.id, fileId }), undefined);
    assert.equal(await rev.submittedFile(sqlA, { companyId, batchId: x.batchId, candidateId: randomUUID(), fileId }), undefined);
    const draft = await startedWith("draft");
    const added = await att.addAttemptFile(sqlA, fileFor(draft.id, draft.attemptId, 41));
    assert.ok(added && added.status === "added");
    assert.equal(await rev.submittedFile(sqlA, { companyId, batchId: draft.batchId, candidateId: draft.id, fileId: added.file.id }), undefined, "not submitted: not downloadable");
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

  // ── H10: decisions and shared results ──
  const recruiter = `recr-${run}@test.invalid`;
  const head = `head-${run}@test.invalid`;
  async function people() {
    for (const [email, role] of [[recruiter, "recruiter"], [head, "company_head"]] as const) {
      await one.query(`insert into course.company_members (email, company_id, role, name) select $1, $2, 'employee', $3
                        where not exists (select 1 from course.company_members where email = $1 and company_id = $2)`, [email, companyId, role]);
      await one.query(`insert into course.company_member_roles (company_id, email, role) select $1, $2, $3
                        where not exists (select 1 from course.company_member_roles where company_id = $1 and email = $2 and role = $3)`, [companyId, email, role]);
    }
  }
  const decide = (attemptId: string, over: Partial<Parameters<typeof dec.recordDecision>[1]> = {}, sql = sqlA) =>
    dec.recordDecision(sql, { companyId, attemptId, actor: recruiter, baseRevision: 0, decision: "shortlisted", reason: "Clear design.", ...over });

  test("recruiters and company heads decide, with a reason; a decision may come before a review and says so", async () => {
    await people();
    const running = await startedWith("not yet");
    assert.deepEqual(await decide(running.attemptId), { status: "not_submitted" });
    const x = await submitted();
    assert.deepEqual(await decide(x.attemptId, { actor: reviewer }), { status: "refused" }, "a reviewer scores, doesn't decide");
    assert.deepEqual(await decide(x.attemptId, { companyId: randomUUID() }), { status: "refused" }, "another company");
    assert.deepEqual(await decide(x.attemptId, { reason: "   " }), { status: "invalid" });
    assert.deepEqual(await decide(x.attemptId, { reason: "x".repeat(1001) }), { status: "invalid" });
    assert.deepEqual(await decide(x.attemptId, { decision: "hired" as never }), { status: "invalid" });

    assert.deepEqual(await decide(x.attemptId), { status: "recorded", revision: 1 }, "before any review");
    assert.equal((await review(x.attemptId))?.status, "recorded");
    assert.deepEqual(await decide(x.attemptId, { actor: head, baseRevision: 1, decision: "on_hold", reason: "Waiting on the panel." }), { status: "recorded", revision: 2 });
    const h = (await dec.decisionHistory(sqlA, companyId, x.attemptId))!;
    assert.deepEqual(h.decisions.map((d) => [d.revision, d.decision, d.reviewRevision, d.decidedBy]), [[2, "on_hold", 1, head], [1, "shortlisted", null, recruiter]]);
    assert.deepEqual(await dec.decisionHistory(sqlA, randomUUID(), x.attemptId), { decisions: [], shares: [] }, "another company sees none");
    const ev = (await one.query(`select actor_kind, detail from course.hiring_events where attempt_id = $1 and kind = 'decision_recorded' order by at`, [x.attemptId])).rows;
    assert.deepEqual(ev.map((e) => e.detail.decision), ["shortlisted", "on_hold"]);
    assert.equal((await dec.decisionsForBatch(sqlA, companyId, x.batchId))!.get(x.attemptId)?.decision, "on_hold", "newest counts");

    // The role ends it at once.
    await one.query(`delete from course.company_member_roles where company_id = $1 and email = $2`, [companyId, recruiter]);
    try {
      assert.deepEqual(await decide(x.attemptId, { baseRevision: 2 }), { status: "refused" });
    } finally {
      await one.query(`insert into course.company_member_roles (company_id, email, role) values ($1, $2, 'recruiter')`, [companyId, recruiter]);
    }
  });

  test("two people deciding at once: one lands; decisions can't be edited or deleted; a score never decides", async () => {
    await people();
    const x = await submitted();
    assert.equal((await review(x.attemptId, { scores: [{ points: 4, note: "" }] }))?.status, "recorded");
    assert.equal((await dec.decisionsForBatch(sqlA, companyId, x.batchId))!.get(x.attemptId)?.decision, null, "a full score decides nothing");
    const [p, q] = await Promise.all([decide(x.attemptId, {}, sqlA), decide(x.attemptId, { decision: "not_shortlisted", actor: head }, sqlB)]);
    assert.deepEqual([p?.status, q?.status].sort(), ["conflict", "recorded"]);
    await assert.rejects(one.query(`update course.hiring_decisions set decision = 'shortlisted' where attempt_id = $1`, [x.attemptId]), /cannot be changed/);
    await assert.rejects(one.query(`delete from course.hiring_decisions where attempt_id = $1`, [x.attemptId]), /only with their attempt/);
  });

  test("sharing follows the pinned policy: refused for 'none' or before a review; a share keeps the review it showed", async () => {
    await people();
    // This file's test pins results 'none'.
    const none = await submitted();
    assert.equal((await review(none.attemptId))?.status, "recorded");
    assert.deepEqual(await dec.shareResult(sqlA, { companyId, attemptId: none.attemptId, actor: recruiter }), { status: "not_allowed" });

    // A second test that shows results by area.
    const assessments = await import("../src/lib/company/assessment-data");
    const areaSlug = `${slug}-area`;
    await assessments.saveDraft(sqlA, { ...code, slug: areaSlug } as CatalogAssessment, {
      ...content, results: "by_area",
      rubric: [{ title: "API", skill: "APIs", points: 4, guide: "Secret guide." }, { title: "Data", skill: "Data", points: 6, guide: "Another guide." }],
    }, 0, "a@test.invalid");
    await assessments.publishDraft(sqlA, areaSlug, "Area practical", 1, "a@test.invalid");
    const areaVersion = (await assessments.loadVersions(sqlA, areaSlug))![0].id;
    await one.query(`insert into course.company_assessment_reviews (company_id, version_id, decision, decided_by) values ($1, $2, 'approved', $3)`, [companyId, areaVersion, reviewer]);
    const { batchId, id } = await invited({ item: areaSlug, versionId: areaVersion });
    const started = await att.startAttempt(sqlA, id, 1);
    assert.ok(started && started.status === "started");
    const attemptId = started.attempt.id;
    await att.saveDraft(sqlA, { candidateId: id, generation: 1, attemptId, baseRevision: 0, answer: "area answer" });
    assert.equal((await att.submitAttempt(sqlA, { candidateId: id, generation: 1, attemptId, revision: 1 }))?.status, "submitted");

    const share = () => dec.shareResult(sqlA, { companyId, attemptId, actor: recruiter });
    assert.deepEqual(await share(), { status: "not_reviewed" });
    assert.deepEqual(await dec.shareResult(sqlA, { companyId, attemptId, actor: reviewer }), { status: "refused" });
    assert.deepEqual(await dec.shareResult(sqlA, { companyId: randomUUID(), attemptId, actor: recruiter }), { status: "refused" });
    assert.equal(await dec.sharedResultFor(sqlA, attemptId), undefined, "nothing until shared");

    assert.equal((await review(attemptId, { scores: [{ points: 3, note: "Private note." }, { points: 5, note: "" }], summary: "Private summary." }))?.status, "recorded");
    assert.deepEqual(await share(), { status: "shared", reviewRevision: 1, policy: "by_area" });
    assert.deepEqual(await share(), { status: "already", reviewRevision: 1, policy: "by_area" }, "a second press changes nothing");
    const seen = (await dec.sharedResultFor(sqlA, attemptId))!;
    assert.deepEqual({ ...seen, sharedAt: "" }, { policy: "by_area", total: 8, max: 10, areas: [{ title: "API", points: 3, max: 4 }, { title: "Data", points: 5, max: 6 }], sharedAt: "" });
    assert.doesNotMatch(JSON.stringify(seen), /Private|guide/i, "never notes, summary or guides");

    // A later review doesn't reach the candidate until shared again.
    assert.equal((await review(attemptId, { baseRevision: 1, scores: [{ points: 4, note: "" }, { points: 6, note: "" }] }))?.status, "recorded");
    assert.equal((await dec.sharedResultFor(sqlA, attemptId))!.total, 8);
    assert.deepEqual(await share(), { status: "shared", reviewRevision: 2, policy: "by_area" });
    assert.equal((await dec.sharedResultFor(sqlA, attemptId))!.total, 10);
    const h = (await dec.decisionHistory(sqlA, companyId, attemptId))!;
    assert.deepEqual(h.shares.map((x) => x.reviewRevision), [2, 1]);
    assert.equal((await dec.decisionsForBatch(sqlA, companyId, batchId))!.get(attemptId)?.sharedRevision, 2);
    assert.deepEqual((await one.query(`select count(*)::int n from course.hiring_events where attempt_id = $1 and kind = 'result_shared'`, [attemptId])).rows[0].n, 2);
    await assert.rejects(one.query(`update course.result_shares set policy = 'overall' where attempt_id = $1`, [attemptId]), /cannot be changed/);
  });

  test("the review address finds a person's round only within this company and test (U10)", async () => {
    const { roundOfCandidate } = await import("../src/lib/company/round-data");
    const { batchId, id } = await invited();
    assert.equal(await roundOfCandidate(sqlA, companyId, slug, id), batchId);
    assert.equal(await roundOfCandidate(sqlA, randomUUID(), slug, id), undefined, "another company");
    assert.equal(await roundOfCandidate(sqlA, companyId, `${slug}-other`, id), undefined, "another test");
    assert.equal(await roundOfCandidate(sqlA, companyId, slug, randomUUID()), undefined);
  });

  test("U11: an internal round is scored but never decided; My assessments finds only my own sent invitations", async () => {
    await people();
    const mine = await import("../src/lib/company/my-assessments");
    const email = `colleague-${run}@test.invalid`;
    const externalBatchId = (await invited()).batchId;
    await one.query(`update course.catalog_items set assessment_audience = 'internal' where slug = $1`, [slug]);
    const made = await data.createBatch(sqlA, input({ candidates: [{ name: "Colleague", email, extraMinutes: 0 }] }));
    const batchId = (made as { id: string }).id;
    assert.equal((await one.query(`select purpose from course.hiring_batches where id = $1`, [batchId])).rows[0].purpose, "internal");
    assert.equal((await one.query(`select purpose from course.hiring_batches where id = $1`, [externalBatchId])).rows[0].purpose, "hiring", "external assessment");

    // A draft isn't an invitation yet.
    assert.equal(await mine.hasMyInvitations(sqlA, companyId, email), false);
    const [t] = (await data.startSending(sqlA, companyId, batchId, "rec"))!;
    await data.recordMail(sqlA, { candidateId: t.id, kind: "invite", generation: 1, outcome: "sent", error: null, by: "rec" });
    assert.equal(await mine.hasMyInvitations(sqlA, companyId, email.toUpperCase()), true, "any case");
    assert.equal(await mine.hasMyInvitations(sqlA, randomUUID(), email), false, "another company");
    assert.deepEqual((await mine.myInvitations(sqlA, companyId, email))!.map((r) => [r.id, r.purpose]), [[t.id, "internal"]]);
    assert.deepEqual(await mine.myInvitations(sqlA, companyId, "someone-else@test.invalid"), []);
    assert.deepEqual(await mine.myInvitation(sqlA, companyId, email, t.id), { id: t.id, generation: 1 });
    assert.equal(await mine.myInvitation(sqlA, companyId, "someone-else@test.invalid", t.id), undefined, "not mine");
    assert.equal(await mine.myInvitation(sqlA, randomUUID(), email, t.id), undefined, "not this company");

    const started = await att.startAttempt(sqlA, t.id, 1);
    assert.ok(started && started.status === "started");
    await att.saveDraft(sqlA, { candidateId: t.id, generation: 1, attemptId: started.attempt.id, baseRevision: 0, answer: "internal answer" });
    assert.equal((await att.submitAttempt(sqlA, { candidateId: t.id, generation: 1, attemptId: started.attempt.id, revision: 1 }))?.status, "submitted");
    assert.equal((await review(started.attempt.id))?.status, "recorded", "scored like anyone");
    assert.deepEqual(await decide(started.attempt.id), { status: "internal" }, "never shortlisted");
    assert.equal((await one.query(`select count(*)::int n from course.hiring_decisions where attempt_id = $1`, [started.attempt.id])).rows[0].n, 0);
    assert.equal((await mine.myInvitations(sqlA, companyId, email))![0].submittedAt !== null, true);
  });
  test("L2: a test with questions saves each answer on its own, files per question, and Submit freezes them all", async () => {
    // A new version with a written-with-files question and a pick-all question, approved, so new rounds use it.
    const assessments = await import("../src/lib/company/assessment-data");
    const qs = [
      { section: "Part A", title: "Explain", brief: "Explain joins.", submission: "written_file" as const, rubric: [{ title: "Clarity", skill: "SQL", points: 4, guide: "g" }] },
      { section: "Part B", title: "Pick", brief: "Which are joins?", submission: "written" as const, rubric: [],
        mcq: { options: [{ text: "LEFT", correct: true }, { text: "SUM", correct: false }, { text: "INNER", correct: true }], points: 2, partial: true } },
    ];
    const multi: AssessmentContent = { ...content, taskTitle: "", taskBrief: "", rubric: [], questions: qs };
    const draft = await assessments.loadDraft(sqlA, slug);
    assert.equal((await assessments.saveDraft(sqlA, code, multi, draft!.revision, "a@test.invalid"))?.status, "saved");
    assert.equal((await assessments.publishDraft(sqlA, slug, "Attempt practical", draft!.revision + 1, "a@test.invalid"))?.status, "published");
    versionId = (await assessments.loadVersions(sqlA, slug))![0].id;
    await one.query(`insert into course.company_assessment_reviews (company_id, version_id, decision, decided_by) values ($1, $2, 'approved', $3)`, [companyId, versionId, reviewer]);

    const { id } = await invited();
    const started = await att.startAttempt(sqlA, id, 1);
    assert.ok(started && started.status !== "refused");
    const attemptId = started.attempt.id;
    const task = await att.attemptTask(sqlA, attemptId);
    assert.equal(task?.questions?.length, 2);
    assert.deepEqual(task?.questions?.[1].options, ["LEFT", "SUM", "INNER"]);
    assert.equal(task?.questions?.[1].multi, true);
    assert.ok(!JSON.stringify(task).includes("correct"), "the candidate's task never says which options are right");
    assert.ok(!JSON.stringify(task).includes("\"g\""), "nor a scoring guide");

    const who = { candidateId: id, generation: 1, attemptId };
    const one1 = await att.saveQuestionAnswer(sqlA, { ...who, questionNo: 1, baseRevision: 0, answer: "A join matches rows.", picked: [] });
    const two1 = await att.saveQuestionAnswer(sqlB, { ...who, questionNo: 2, baseRevision: 0, answer: "", picked: [0, 2] });
    assert.equal(one1?.status, "saved");
    assert.equal(two1?.status, "saved", "two questions never clash");
    assert.equal((await att.saveQuestionAnswer(sqlA, { ...who, questionNo: 2, baseRevision: 0, answer: "", picked: [1] }))?.status, "conflict", "an older tab on the same question");
    assert.equal((await att.saveQuestionAnswer(sqlA, { ...who, questionNo: 1, baseRevision: 1, answer: "A join matches rows on keys.", picked: [] }))?.status, "saved");
    assert.equal((await att.saveQuestionAnswer(sqlA, { ...who, candidateId: randomUUID(), questionNo: 1, baseRevision: 2, answer: "x", picked: [] }))?.status, "refused");

    // Three files per question, recorded under it.
    const file = (n: number, q: number | null) => att.addAttemptFile(sqlA, { ...who, questionNo: q, name: `f${n}.txt`, kind: "txt", bytes: 10, sha256: String(n).padStart(64, "0"), storageKey: `k/${run}/${n}` });
    for (const n of [1, 2, 3]) assert.equal((await file(n, 1))?.status, "added");
    assert.equal((await file(4, 1))?.status, "full");
    assert.deepEqual(await att.fileSlot(sqlA, { ...who, questionNo: 1 }), { status: "open", companyId, count: 3 });
    assert.deepEqual(await att.fileSlot(sqlA, { ...who, questionNo: 2 }), { status: "open", companyId, count: 0 }, "each question has its own three");

    const answers = await att.loadAnswers(sqlA, attemptId);
    assert.deepEqual(answers?.get(2)?.picked, [0, 2]);
    assert.equal(answers?.get(1)?.revision, 2);

    const out = await att.submitAttempt(sqlA, { ...who, revision: null });
    assert.equal(out?.status, "submitted");
    const sub = await att.loadSubmission(sqlA, attemptId);
    assert.equal(sub?.answers?.length, 2);
    assert.equal(sub?.answers?.[0].answer, "A join matches rows on keys.");
    assert.deepEqual(sub?.answers?.[1].picked, [0, 2]);
    assert.deepEqual(sub?.answers?.[0].files.map((f) => f.name), ["f1.txt", "f2.txt", "f3.txt"]);
    assert.deepEqual(sub?.files, [], "files sit under their question");
    // Frozen: no answer changes after Submit.
    assert.equal((await att.saveQuestionAnswer(sqlA, { ...who, questionNo: 1, baseRevision: 2, answer: "late", picked: [] }))?.status, "submitted");
    await assert.rejects(one.query(`update course.attempt_answers set answer = 'x' where attempt_id = $1`, [attemptId]), /submitted/);
    await assert.rejects(one.query(`update course.attempt_submissions set answers = null where attempt_id = $1`, [attemptId]), /cannot be changed/);

    // The reviewer's view has the questions, right options included, and each answer.
    const batchId = (await one.query(`select batch_id from course.candidate_attempts where id = $1`, [attemptId])).rows[0].batch_id as string;
    const view = await rev.loadReviewView(sqlA, companyId, batchId, id);
    assert.equal(view?.questions?.length, 2);
    assert.equal(view?.questions?.[1].mcq?.options[0].correct, true);
    assert.deepEqual(view?.submission?.answers?.[1].picked, [0, 2]);
    assert.equal(view?.submission?.answers?.[0].files.length, 3);
  });

  test("L2: the deadline submits saved answers too", async () => {
    const { id, attemptId } = await pastAttempt(90, 60);
    await one.query(`insert into course.attempt_answers (attempt_id, question_no, revision, answer, picked) values ($1, 2, 1, '', '{1}')`, [attemptId]);
    assert.ok(((await att.finaliseDue(sqlA, { candidateId: id })) ?? 0) >= 1);
    const sub = await att.loadSubmission(sqlA, attemptId);
    assert.equal(sub?.kind, "deadline");
    assert.deepEqual(sub?.answers, [{ questionNo: 2, answer: "", picked: [1], files: [] }]);
  });
  test("U06a: settings save per company and revision; access off or ended stops new starts, never a running one", async () => {
    const ts = await import("../src/lib/company/test-settings-data");
    const fresh = await ts.loadTestSettings(sqlA, companyId, slug);
    assert.equal(fresh?.revision, 0, "no row: the defaults");
    assert.equal(fresh?.accessOpen, true);
    const base = { companyId, item: slug, by: "rec@test.invalid" };
    assert.deepEqual(await ts.saveTestSettings(sqlA, { ...base, group: "basic", expected: 0, accessOpen: true, endsOn: null, tags: ["Campus"] }), { status: "saved", revision: 1 });
    assert.deepEqual(await ts.saveTestSettings(sqlA, { ...base, group: "basic", expected: 0, accessOpen: true, endsOn: null, tags: [] }), { status: "changed" }, "a second first save");
    assert.deepEqual(await ts.saveTestSettings(sqlA, { ...base, group: "email", expected: 1, autoRemind: false, invite: { subject: "S", body: "B" } }), { status: "saved", revision: 2 });
    const now2 = await ts.loadTestSettings(sqlA, companyId, slug);
    assert.deepEqual([now2?.tags, now2?.autoRemind, now2?.invite], [["Campus"], false, { subject: "S", body: "B" }], "each group keeps the other's");
    await assert.rejects(one.query(`update course.company_test_settings set invite_body = null where company_id = $1 and item_slug = $2`, [companyId, slug]), /company_test_settings_template/);

    // Someone mid-test, then access goes off.
    const running = await invited();
    const started = await att.startAttempt(sqlA, running.id, 1);
    assert.equal(started?.status, "started");
    assert.equal((await ts.saveTestSettings(sqlA, { ...base, group: "basic", expected: 2, accessOpen: false, endsOn: null, tags: ["Campus"] }))?.status, "saved");
    const waiting = await invited();
    assert.deepEqual(await att.startAttempt(sqlA, waiting.id, 1), { status: "refused" }, "access off: no new start");
    assert.equal((await att.startAttempt(sqlA, running.id, 1))?.status, "resumed", "a running attempt carries on");

    // Back on, but ended.
    assert.equal((await ts.saveTestSettings(sqlA, { ...base, group: "basic", expected: 3, accessOpen: true, endsOn: null, tags: [] }))?.status, "saved");
    await one.query(`update course.company_test_settings set ends_on = now() - interval '1 minute' where company_id = $1 and item_slug = $2`, [companyId, slug]);
    assert.deepEqual(await att.startAttempt(sqlA, waiting.id, 1), { status: "refused" }, "past the end date");
    await one.query(`update course.company_test_settings set ends_on = null where company_id = $1 and item_slug = $2`, [companyId, slug]);
    assert.equal((await att.startAttempt(sqlA, waiting.id, 1))?.status, "started", "open again");
  });

  test("U06a: the automatic reminder skips a test whose reminders are off", async () => {
    // Last start about two hours away: due for the automatic reminder.
    const closes = new Date(Date.now() + (await one.query(`select minutes from course.assessment_versions where id = $1`, [versionId])).rows[0].minutes * 60000 + 15 * 60000 + 2 * hour);
    const due = await invited({ closesAt: closes });
    const ids = async () => ((await data.claimAutoReminders(sqlA)) ?? []).map((t) => t.id);
    await one.query(`update course.company_test_settings set auto_remind = false where company_id = $1 and item_slug = $2`, [companyId, slug]);
    assert.ok(!(await ids()).includes(due.id), "reminders off");
    await one.query(`update course.company_test_settings set auto_remind = true where company_id = $1 and item_slug = $2`, [companyId, slug]);
    assert.ok((await ids()).includes(due.id), "reminders on");
  });
});
