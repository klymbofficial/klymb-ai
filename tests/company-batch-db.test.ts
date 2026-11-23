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
 * Opt-in: runs only when TEST_DATABASE_URL points at a throwaway database
 * with migrations through 0052. Needs the react-server condition, since the
 * modules it tests are server-only:
 *
 *   TEST_DATABASE_URL=postgres://... node --conditions=react-server --import tsx --test tests/company-batch-db.test.ts
 *
 * It makes its own company, members and assessment. The published version
 * and its catalog row stay behind (versions can't be deleted). It refuses to
 * run against the app's own DATABASE_URL or DATABASE_MIGRATE_URL. Nothing is
 * emailed: it calls the claim and record steps directly.
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

describe("hiring batches against a real database", { skip }, () => {
  const one = new Client(connectionOptions(url ?? ""));
  const two = new Client(connectionOptions(url ?? ""));
  const run = randomUUID().slice(0, 8);
  const slug = `test-${run}`;
  const reviewer = `rev-${run}@test.invalid`;
  let companyId = "";
  let versionId = "";
  let batchId = "";
  let sqlA: Db;
  let sqlB: Db;
  let data: typeof import("../src/lib/company/batch-data");
  let access: typeof import("../src/lib/access");

  const code = { kind: "assessment", slug, title: "Test practical", suggestedSkills: ["APIs"], suggestedPurposes: ["hiring"] } as unknown as CatalogAssessment;
  const content: AssessmentContent = {
    role: "Backend engineer", minutes: 60, submission: "written", toolsAllowed: ["Docs"], toolsNotAllowed: [],
    instructions: "Write it up.", taskTitle: "Task", taskBrief: "Design it.", sampleTitle: "Practice", sampleBrief: "Try this.",
    rubric: [{ title: "API", skill: "APIs", points: 4, guide: "Clear endpoints." }], results: "none",
  };
  const hour = 3600000;
  const batch = (over: Partial<BatchInput> = {}): BatchInput & { companyId: string; requestKey: string; by: string } => ({
    item: slug, versionId, role: "Backend engineer", prepCourse: "system-design", reviewer, timeZone: "UTC",
    opensAt: new Date(Date.now() - hour), closesAt: new Date(Date.now() + 48 * hour),
    candidates: [
      { name: "Asha", email: `asha-${run}@test.invalid`, extraMinutes: 0 },
      { name: "Ravi", email: `ravi-${run}@test.invalid`, extraMinutes: 30 },
    ],
    companyId, requestKey: randomUUID(), by: "rec@test.invalid", ...over,
  });
  const candidates = async () => (await one.query(`select id, email, delivery, link_generation, status from course.batch_candidates where batch_id = $1 order by email`, [batchId])).rows;

  before(async () => {
    const assessments = await import("../src/lib/company/assessment-data");
    data = await import("../src/lib/company/batch-data");
    access = await import("../src/lib/access");
    await one.connect();
    await two.connect();
    sqlA = adapter(one);
    sqlB = adapter(two);
    companyId = (await one.query(`insert into course.companies (slug, name, seat_count) values ($1, 'Batch test', 5) returning id`, [`batch-${run}`])).rows[0].id;
    await one.query(`insert into course.company_members (email, company_id, role, name) values ($1, $2, 'employee', 'Rev')`, [reviewer, companyId]);
    await one.query(`insert into course.company_member_roles (company_id, email, role) values ($1, $2, 'reviewer')`, [companyId, reviewer]);
    await assessments.saveDraft(sqlA, code, content, 0, "a@test.invalid");
    await assessments.publishDraft(sqlA, slug, "Test practical", 1, "a@test.invalid");
    versionId = (await assessments.loadVersions(sqlA, slug))![0].id;
  });

  after(async () => {
    if (companyId) await one.query(`delete from course.companies where id = $1`, [companyId]);
    await one.query(`delete from course.assessment_drafts where slug = $1`, [slug]);
    await one.end();
    await two.end();
  });

  test("a batch needs a version the company approved", async () => {
    assert.deepEqual(await data.createBatch(sqlA, batch()), { status: "changed" }, "not approved yet");
    await one.query(`insert into course.company_assessment_reviews (company_id, version_id, decision, decided_by) values ($1, $2, 'approved', $3)`, [companyId, versionId, reviewer]);
    const input = batch();
    const made = await data.createBatch(sqlA, input);
    assert.equal(made?.status, "created");
    batchId = (made as { id: string }).id;
    assert.deepEqual(await data.createBatch(sqlA, input), { status: "repeat", id: batchId }, "a retried submit finds the first");
    assert.equal((await candidates()).length, 2);
  });

  test("sending claims everyone once; a second click sends nothing", async () => {
    const [x, y] = await Promise.all([
      data.startSending(sqlA, companyId, batchId, "rec@test.invalid"),
      data.startSending(sqlB, companyId, batchId, "rec@test.invalid"),
    ]);
    assert.deepEqual([x!.length, y!.length].sort(), [0, 2]);
    assert.deepEqual((await candidates()).map((c) => c.delivery), ["sending", "sending"]);
  });

  test("a failed delivery is retried with the same link and adds nobody", async () => {
    const [asha, ravi] = await candidates();
    await data.recordMail(sqlA, { candidateId: asha.id, kind: "invite", generation: 1, outcome: "sent", error: null, by: "rec" });
    await data.recordMail(sqlA, { candidateId: ravi.id, kind: "invite", generation: 1, outcome: "failed", error: "Mailbox does not exist", by: "rec" });
    assert.deepEqual((await candidates()).map((c) => c.delivery), ["sent", "failed"]);

    const [p, q] = await Promise.all([data.claimRetry(sqlA, companyId, batchId, null), data.claimRetry(sqlB, companyId, batchId, null)]);
    assert.deepEqual([p!.length, q!.length].sort(), [0, 1], "two retries at once claim Ravi once");
    const retried = [...p!, ...q!][0];
    assert.equal(retried.id, ravi.id);
    assert.equal(retried.generation, 1, "the same link");
    await data.recordMail(sqlA, { candidateId: ravi.id, kind: "invite", generation: 1, outcome: "sent", error: null, by: "rec" });
    const after = await candidates();
    assert.equal(after.length, 2);
    assert.deepEqual(after.map((c) => [c.delivery, c.link_generation]), [["sent", 1], ["sent", 1]]);
    const log = (await one.query(`select count(*)::int n from course.batch_mail_log where candidate_id = $1`, [ravi.id])).rows[0].n;
    assert.equal(log, 2, "both attempts are in the log");
  });

  test("a new link turns the old one off, and a late result for the old one changes nothing", async () => {
    const [asha] = await candidates();
    const t = await data.claimChange(sqlA, companyId, batchId, asha.id, { kind: "new_link" });
    assert.ok(t && t !== "taken");
    assert.equal(t.generation, 2);
    assert.equal(await data.claimChange(sqlA, companyId, batchId, asha.id, { kind: "new_link" }), undefined, "not while that email is on its way");
    await data.recordMail(sqlA, { candidateId: asha.id, kind: "invite", generation: 1, outcome: "failed", error: "late", by: "rec" });
    assert.equal((await candidates())[0].delivery, "sending", "the old link's result doesn't touch the new send");
    await data.recordMail(sqlA, { candidateId: asha.id, kind: "new_link", generation: 2, outcome: "sent", error: null, by: "rec" });
    const view = await data.candidateByLink(sqlA, asha.id);
    assert.equal(view?.candidate.generation, 2);
  });

  test("a reminder goes once per double click", async () => {
    const [a, b] = await Promise.all([data.claimReminders(sqlA, companyId, batchId, null), data.claimReminders(sqlB, companyId, batchId, null)]);
    assert.equal(a!.length + b!.length, 2, "each person once");
    assert.equal((await data.claimReminders(sqlA, companyId, batchId, null))!.length, 0);
  });

  test("an extension moves one person's last start", async () => {
    const [, ravi] = await candidates();
    const until = new Date(Date.now() + 72 * hour);
    const t = await data.claimChange(sqlA, companyId, batchId, ravi.id, { kind: "extension", extraMinutes: 45, lastStartAt: until });
    assert.ok(t && t !== "taken");
    assert.equal(t.generation, 1, "the link stays the same");
    assert.equal(t.extraMinutes, 45);
    assert.equal(new Date(t.lastStartAt!).toISOString(), until.toISOString());
  });

  test("the automatic reminder goes once, to people within a day of their last start", async () => {
    const made = await data.createBatch(sqlA, batch({ closesAt: new Date(Date.now() + 10 * hour), candidates: [{ name: "Soon", email: `soon-${run}@test.invalid`, extraMinutes: 0 }] }));
    assert.equal(made?.status, "created");
    const soonBatch = (made as { id: string }).id;
    const [soon] = (await data.startSending(sqlA, companyId, soonBatch, "rec"))!;
    const mine = async () => (await data.claimAutoReminders(sqlA))!.filter((t) => t.batchId === soonBatch || t.batchId === batchId);
    assert.deepEqual(await mine(), [], "not before the invitation is delivered");
    await data.recordMail(sqlA, { candidateId: soon.id, kind: "invite", generation: 1, outcome: "sent", error: null, by: "rec" });
    const due = await mine();
    assert.deepEqual(due.map((t) => t.id), [soon.id], "the first batch's people start later than a day from now");
    assert.deepEqual(await mine(), [], "a second run sends nothing");
  });

  test("the prep course opens for active candidates of a sent batch only", async () => {
    const [asha] = await candidates();
    assert.ok(await access.candidatePrep(sqlA, asha.email, "system-design"));
    assert.equal(await access.candidatePrep(sqlA, asha.email, "dsa"), null, "only the course the batch names");
    assert.equal(await data.cancelCandidate(sqlA, companyId, batchId, asha.id, "rec"), 1);
    assert.equal(await access.candidatePrep(sqlA, asha.email, "system-design"), null, "a cancelled invitation closes it");
    assert.equal((await data.candidateByLink(sqlA, asha.id))?.candidate.status, "cancelled");
    assert.equal(await data.claimChange(sqlA, companyId, batchId, asha.id, { kind: "new_link" }), undefined, "a cancelled person can't be sent a new link");
  });

  test("a cancelled batch stops every link and every send", async () => {
    assert.equal(await data.cancelBatch(sqlA, companyId, batchId, "rec"), 1);
    assert.equal((await data.candidateByLink(sqlA, (await candidates())[1].id))?.batch.status, "cancelled");
    assert.equal((await data.claimRetry(sqlA, companyId, batchId, null))!.length, 0);
    assert.equal((await data.claimReminders(sqlA, companyId, batchId, null))!.length, 0);
  });

  // H01: no email carrying a link goes out once that person's last start has passed. The version allows 60 minutes.
  const minute = 60000;
  const people = async (id: string) =>
    (await one.query(`select id, email, delivery, status from course.batch_candidates where batch_id = $1 order by email`, [id])).rows as { id: string; email: string; delivery: string; status: string }[];
  const statusOf = async (id: string) => (await one.query(`select status from course.hiring_batches where id = $1`, [id])).rows[0].status as string;

  test("a draft nobody can start in time isn't sent and stays a draft", async () => {
    // Closes in 30 minutes; with 60 allowed, everyone's last start was half an hour ago.
    const made = await data.createBatch(sqlA, batch({ closesAt: new Date(Date.now() + 30 * minute), candidates: [{ name: "Late", email: `late-${run}@test.invalid`, extraMinutes: 0 }] }));
    const id = (made as { id: string }).id;
    assert.deepEqual(await data.startSending(sqlA, companyId, id, "rec"), []);
    assert.equal(await statusOf(id), "draft");
    assert.deepEqual((await people(id)).map((p) => p.delivery), ["pending"]);
  });

  test("a mixed draft sends only the people who can still start; the rest stay unsent", async () => {
    // Closes in 70 minutes: 60 allowed starts by +10; 60 + 30 extra had to start 20 minutes ago.
    const made = await data.createBatch(sqlA, batch({
      closesAt: new Date(Date.now() + 70 * minute),
      candidates: [{ name: "Ontime", email: `a-ontime-${run}@test.invalid`, extraMinutes: 0 }, { name: "Extra", email: `b-extra-${run}@test.invalid`, extraMinutes: 30 }],
    }));
    const id = (made as { id: string }).id;
    const [x, y] = await Promise.all([data.startSending(sqlA, companyId, id, "rec"), data.startSending(sqlB, companyId, id, "rec")]);
    const claimed = [...x!, ...y!];
    assert.deepEqual(claimed.map((t) => t.name), ["Ontime"], "two clicks at once still claim once, and only the one who can start");
    assert.equal(await statusOf(id), "sent");
    assert.deepEqual((await people(id)).map((p) => p.delivery), ["sending", "pending"]);
  });

  test("retry, new link and a corrected address refuse someone whose last start has passed; a later start brings them back", async () => {
    const made = await data.createBatch(sqlA, batch({ closesAt: new Date(Date.now() + 48 * hour), candidates: [{ name: "Gone", email: `gone-${run}@test.invalid`, extraMinutes: 0 }] }));
    const id = (made as { id: string }).id;
    const [gone] = (await data.startSending(sqlA, companyId, id, "rec"))!;
    await data.recordMail(sqlA, { candidateId: gone.id, kind: "invite", generation: 1, outcome: "failed", error: "Mailbox full", by: "rec" });
    // An extension that has itself run out.
    await one.query(`update course.batch_candidates set last_start_at = now() - interval '1 minute' where id = $1`, [gone.id]);

    assert.deepEqual(await data.claimRetry(sqlA, companyId, id, [gone.id]), [], "retry of one");
    assert.deepEqual(await data.claimRetry(sqlA, companyId, id, null), [], "retry of every failed one");
    assert.equal(await data.claimChange(sqlA, companyId, id, gone.id, { kind: "new_link" }), undefined, "new link");
    assert.equal(await data.claimChange(sqlA, companyId, id, gone.id, { kind: "email", email: `gone2-${run}@test.invalid` }), undefined, "corrected address");
    assert.equal(await data.claimChange(sqlA, companyId, id, gone.id, { kind: "extension", extraMinutes: 0, lastStartAt: new Date(Date.now() - minute) }), undefined, "a new time that is itself past");
    const unchanged = (await one.query(`select delivery, link_generation, email from course.batch_candidates where id = $1`, [gone.id])).rows[0];
    assert.deepEqual([unchanged.delivery, unchanged.link_generation, unchanged.email], ["failed", 1, `gone-${run}@test.invalid`], "no state changed by a refusal");

    const later = new Date(Date.now() + 24 * hour);
    const t = await data.claimChange(sqlA, companyId, id, gone.id, { kind: "extension", extraMinutes: 0, lastStartAt: later });
    assert.ok(t && t !== "taken", "a later start is the way back");
    assert.equal(new Date(t.lastStartAt!).toISOString(), later.toISOString());
  });

  test("an unsent person left by the send gets their link with a later start", async () => {
    const made = await data.createBatch(sqlA, batch({
      closesAt: new Date(Date.now() + 70 * minute),
      candidates: [{ name: "Ontime", email: `c-ontime-${run}@test.invalid`, extraMinutes: 0 }, { name: "Extra", email: `d-extra-${run}@test.invalid`, extraMinutes: 30 }],
    }));
    const id = (made as { id: string }).id;
    await data.startSending(sqlA, companyId, id, "rec");
    const extra = (await people(id))[1];
    assert.equal(extra.delivery, "pending");
    assert.equal(await data.claimChange(sqlA, companyId, id, extra.id, { kind: "extension", extraMinutes: 30, lastStartAt: null }), undefined, "the batch's rule still leaves them late");
    const t = await data.claimChange(sqlA, companyId, id, extra.id, { kind: "extension", extraMinutes: 30, lastStartAt: new Date(Date.now() + 2 * hour) });
    assert.ok(t && t !== "taken");
    await data.recordMail(sqlA, { candidateId: extra.id, kind: "extension", generation: t.generation, outcome: "sent", error: null, by: "rec" });
    assert.equal((await people(id))[1].delivery, "sent", "the new-time email carried their link");
  });

  // H03: automatic reminders recover from failures and interrupted runs, never repeat one that went out, and stop after three tries.
  test("automatic reminders: a failure is retried, a success isn't repeated, a dead run is picked up, and attempts are capped", async () => {
    const made = await data.createBatch(sqlA, batch({
      closesAt: new Date(Date.now() + 10 * hour),
      candidates: [
        { name: "Fails", email: `auto-a-${run}@test.invalid`, extraMinutes: 0 },
        { name: "Works", email: `auto-b-${run}@test.invalid`, extraMinutes: 0 },
        { name: "Dies", email: `auto-c-${run}@test.invalid`, extraMinutes: 0 },
        { name: "Gone", email: `auto-d-${run}@test.invalid`, extraMinutes: 0 },
      ],
    }));
    const id = (made as { id: string }).id;
    const sent = (await data.startSending(sqlA, companyId, id, "rec"))!;
    for (const t of sent) await data.recordMail(sqlA, { candidateId: t.id, kind: "invite", generation: 1, outcome: "sent", error: null, by: "rec" });
    const by = (name: string) => sent.find((t) => t.name === name)!;
    await data.cancelCandidate(sqlA, companyId, id, by("Gone").id, "rec");
    const mine = async () => (await data.claimAutoReminders(sqlA))!.filter((t) => t.batchId === id).map((t) => t.name).sort();
    const stamp = async (name: string) => (await one.query(`select auto_reminded_at from course.batch_candidates where id = $1`, [by(name).id])).rows[0].auto_reminded_at;

    const [x, y] = await Promise.all([data.claimAutoReminders(sqlA), data.claimAutoReminders(sqlB)]);
    assert.deepEqual([...x!, ...y!].filter((t) => t.batchId === id).map((t) => t.name).sort(), ["Dies", "Fails", "Works"], "two runs at once claim each once; the cancelled one never");

    await data.recordMail(sqlA, { candidateId: by("Fails").id, kind: "auto_reminder", generation: 1, outcome: "failed", error: "Mailbox full", by: null });
    await data.recordMail(sqlA, { candidateId: by("Works").id, kind: "auto_reminder", generation: 1, outcome: "sent", error: null, by: null });
    // "Dies": the run stopped before recording anything.
    assert.equal(await stamp("Fails"), null, "a failure releases the claim");
    assert.notEqual(await stamp("Works"), null);

    assert.deepEqual(await mine(), ["Fails"], "the next run retries the failure only; the dead run's claim is still fresh");
    await data.recordMail(sqlA, { candidateId: by("Fails").id, kind: "auto_reminder", generation: 1, outcome: "skipped", error: "Declined", by: null });

    await one.query(`update course.batch_candidates set auto_reminded_at = now() - interval '11 minutes' where id = any($1)`, [[by("Dies").id, by("Works").id]]);
    assert.deepEqual(await mine(), ["Dies", "Fails"], "a stale claim with nothing logged comes back; one that went out never does");
    await data.recordMail(sqlA, { candidateId: by("Fails").id, kind: "auto_reminder", generation: 1, outcome: "failed", error: "Mailbox full", by: null });
    await data.recordMail(sqlA, { candidateId: by("Dies").id, kind: "auto_reminder", generation: 1, outcome: "sent", error: null, by: null });

    assert.deepEqual(await mine(), [], "three attempts on the same link, then it stops; the recovered one went out");
    const log = (await one.query(
      `select c.name, count(*) filter (where l.outcome = 'sent')::int ok, count(*)::int n from course.batch_mail_log l join course.batch_candidates c on c.id = l.candidate_id
        where c.batch_id = $1 and l.kind = 'auto_reminder' group by c.name order by c.name`, [id])).rows;
    assert.deepEqual(log, [{ name: "Dies", ok: 1, n: 1 }, { name: "Fails", ok: 0, n: 3 }, { name: "Works", ok: 1, n: 1 }], "nobody got two automatic reminders");
  });

  test("automatic reminders skip people whose last start has passed", async () => {
    const made = await data.createBatch(sqlA, batch({ closesAt: new Date(Date.now() + 10 * hour), candidates: [{ name: "Past", email: `auto-p-${run}@test.invalid`, extraMinutes: 0 }] }));
    const id = (made as { id: string }).id;
    const [p] = (await data.startSending(sqlA, companyId, id, "rec"))!;
    await data.recordMail(sqlA, { candidateId: p.id, kind: "invite", generation: 1, outcome: "sent", error: null, by: "rec" });
    await one.query(`update course.batch_candidates set last_start_at = now() - interval '1 minute' where id = $1`, [p.id]);
    assert.deepEqual((await data.claimAutoReminders(sqlA))!.filter((t) => t.batchId === id), []);
  });

  test("another company can't reach the batch", async () => {
    const other = randomUUID();
    assert.equal(await data.loadBatch(sqlA, other, batchId), undefined);
    assert.equal(await data.cancelCandidate(sqlA, other, batchId, (await candidates())[1].id, "x"), 0);
  });
});
