import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";
import { ATTEMPT_LABEL, MAX_ANSWER_CHARS, SAVE_GRACE_SECONDS, attemptState, canSave, clockText, remainingMs } from "../src/lib/company/attempt-rules";
import { candidateTags } from "../src/lib/company/batch-view";

const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const code = (s: string) => s.replace(/--.*$/gm, "");

describe("an attempt's clock", () => {
  const a = { startedAt: "2026-11-25T10:00:00Z", deadlineAt: "2026-11-25T11:30:00Z", submittedAt: null };
  test("in progress until the deadline, time up from it, submitted once submitted", () => {
    assert.equal(attemptState(a, new Date("2026-11-25T11:29:59Z")), "in_progress");
    assert.equal(attemptState(a, new Date("2026-11-25T11:30:00Z")), "time_up", "exactly at the deadline the time is up");
    assert.equal(attemptState({ ...a, submittedAt: "2026-11-25T11:00:00Z" }, new Date("2026-11-25T12:00:00Z")), "submitted");
    assert.equal(ATTEMPT_LABEL.none, "Not started");
  });

  test("time left never goes below zero, and reads as a clock", () => {
    assert.equal(remainingMs(a, new Date("2026-11-25T11:00:00Z")), 30 * 60000);
    assert.equal(remainingMs(a, new Date("2026-11-25T12:00:00Z")), 0);
    assert.equal(clockText(30 * 60000), "30:00");
    assert.equal(clockText(65 * 60000 + 9000), "1:05:09");
    assert.equal(clockText(1), "00:01", "a part second still shows as a second");
  });
});

describe("the recruiter's filters once someone starts", () => {
  test("a started person is under Started, not Can start or Start passed", () => {
    assert.deepEqual(candidateTags({ active: true, delivery: "sent", link: "open", started: true }), ["all", "started", "sent"]);
    assert.deepEqual(candidateTags({ active: true, delivery: "sent", link: "missed", started: true }), ["all", "started", "sent"], "their last start passing after they began doesn't matter");
    assert.deepEqual(candidateTags({ active: false, delivery: "sent", link: "cancelled", started: true }), ["all", "cancelled"]);
  });
});

describe("start and timing, as written", () => {
  const data = read("src/lib/company/attempt-data.ts");
  const start = data.slice(data.indexOf("export async function startAttempt("), data.indexOf("export async function attemptByLink("));

  test("Start checks the current link, an active person, a sent and open batch, and a last start still ahead", () => {
    assert.match(start, /c\.link_generation = \$\{generation\} and c\.status = 'active'/);
    assert.match(start, /b\.status = 'sent' and b\.opens_at <= now\(\)/);
    assert.match(start, /coalesce\(me\.last_start_at, me\.closes_at - make_interval\(mins => me\.minutes \+ me\.extra_minutes\)\) > now\(\)/);
  });

  test("the server sets the deadline, and a second Start makes nothing new", () => {
    assert.match(start, /now\(\) \+ make_interval\(mins => me\.minutes \+ me\.extra_minutes\)/);
    assert.match(start, /on conflict \(candidate_id, attempt_no\) do nothing/);
    assert.match(start, /where not exists \(select 1 from existing\)/);
  });

  test("the candidate never receives the rubric", () => {
    const task = data.slice(data.indexOf("export async function attemptTask("), data.indexOf("export async function recordLinkOpened("));
    assert.doesNotMatch(task, /rubric|guide/);
    const view = read("src/lib/company/batch-data.ts");
    const byLink = view.slice(view.indexOf("export async function candidateByLink("), view.indexOf("export async function hiringOptions("));
    assert.doesNotMatch(byLink, /rubric|task_brief/, "the landing page doesn't get the task before Start");
  });

  test("reminders and invitation retries skip anyone who has started", () => {
    const batch = read("src/lib/company/batch-data.ts");
    for (const fn of ["claimReminders", "claimAutoReminders", "claimRetry"]) {
      const body = batch.slice(batch.indexOf(`export async function ${fn}(`));
      const end = body.indexOf("\nexport ", 1);
      assert.match(body.slice(0, end), /not exists \(select 1 from course\.candidate_attempts a where a\.candidate_id = c\.id\)/, fn);
    }
  });

  test("the attempt page opens only through the current link of an active, sent invitation", () => {
    const page = read("src/app/assessment/[token]/attempt/page.tsx");
    assert.match(page, /found\.candidate\.generation !== ref\.generation \|\| found\.candidate\.status !== "active" \|\| found\.batch\.status !== "sent"/);
    assert.match(page, /attemptState\(attempt, now\) !== "in_progress"/);
    assert.match(page, /<Countdown deadline=\{attempt\.deadlineAt\} serverNow=\{now\.toISOString\(\)\} \/>/);
  });

  test("migration 0053: one attempt per number, a clock that can't move, events written once and never edited", () => {
    const sql = code(read("db/migrations/0053_candidate_attempts.sql"));
    assert.match(sql, /constraint candidate_attempts_once unique \(candidate_id, attempt_no\)/);
    assert.match(sql, /check \(deadline_at = started_at \+ make_interval\(mins => allowed_minutes\)\)/);
    assert.match(sql, /new\.deadline_at <> old\.deadline_at/);
    assert.match(sql, /before update on course\.candidate_attempts/);
    assert.match(sql, /constraint hiring_events_once unique \(op_key\)/);
    assert.match(sql, /raise exception 'hiring_events is append-only'/);
    assert.match(sql, /references course\.batch_candidates \(id, batch_id\)/, "an attempt's person belongs to its batch");
    assert.match(sql, /references course\.hiring_batches \(id, company_id\)/, "and its batch to its company");
  });
});

describe("saving the answer (H07a)", () => {
  const a = { deadlineAt: "2026-11-25T11:30:00Z", submittedAt: null };
  test("saves land until the deadline plus the grace, never after a submit", () => {
    assert.equal(SAVE_GRACE_SECONDS, 30);
    assert.equal(canSave(a, new Date("2026-11-25T11:29:59Z")), true);
    assert.equal(canSave(a, new Date("2026-11-25T11:30:30Z")), true, "a save in flight at the deadline still counts");
    assert.equal(canSave(a, new Date("2026-11-25T11:30:31Z")), false);
    assert.equal(canSave({ ...a, submittedAt: "2026-11-25T11:00:00Z" }, new Date("2026-11-25T11:10:00Z")), false);
  });

  test("the save statement checks the person, the link, the time and the revision", () => {
    const data = read("src/lib/company/attempt-data.ts");
    const save = data.slice(data.indexOf("export async function saveDraft("), data.indexOf("export async function attemptsForBatch("));
    assert.match(save, /c\.link_generation = \$\{s\.generation\} and c\.status = 'active' and b\.status = 'sent'/);
    assert.match(save, /submitted_at is null and now\(\) <= deadline_at \+ make_interval\(secs => \$\{SAVE_GRACE_SECONDS\}\)/);
    assert.match(save, /d\.revision = \$\{s\.baseRevision\}::int/, "only on top of the latest save");
    assert.match(save, /on conflict \(attempt_id\) do nothing/, "a second first save doesn't overwrite");
    const action = read("src/app/assessment/[token]/actions.ts");
    assert.match(action, /answer\.length > MAX_ANSWER_CHARS/);
    assert.equal(MAX_ANSWER_CHARS, 60000);
    assert.match(code(read("db/migrations/0054_attempt_drafts.sql")), /check \(char_length\(answer\) <= 60000\)/);
  });

  test("the answer box saves on its own, on leaving, and at the time limit, and stops on a conflict", () => {
    const editor = read("src/components/company/AnswerEditor.tsx");
    assert.match(editor, /AUTOSAVE_MS/);
    assert.match(editor, /onBlur=\{\(\) => void save\(\)\}/);
    assert.match(editor, /visibilitychange/);
    assert.match(editor, /out\.status === "conflict"\) \{ lock\("conflict"\)/);
    assert.match(editor, /out\.status === "submitted"\) \{ lock\("submitted"\)/, "submitted in another tab: the box stops");
    assert.match(editor, /role="status" aria-live="polite"/);
  });
});

describe("submitting (H08)", () => {
  test("Submit asks first, saves what's typed, waits for uploads, and sends the revision the page shows", () => {
    const work = read("src/components/company/AttemptWork.tsx");
    assert.match(work, /Submit now\? You can&apos;t change/);
    assert.match(work, /control\.current\?\.flush\(\)[\s\S]*submitTest\(token, attemptId, saved\.revision\)/);
    assert.match(work, /disabled=\{pending \|\| files\.busy\}/);
  });

  test("the receipt shows the code, the time, how it was submitted and what was received, never the answer itself", () => {
    const page = read("src/app/assessment/[token]/page.tsx");
    assert.match(page, /function Receipt/);
    assert.match(page, /Automatically at the time limit/);
    assert.doesNotMatch(page, /\{submission\.answer\}/);
    const action = read("src/app/assessment/[token]/actions.ts");
    assert.match(action, /submitAttempt\(sql, \{ candidateId: ref\.id, generation: ref\.generation, attemptId, revision \}\)/);
  });

  test("timed-out attempts are submitted when someone next looks, before attempts are read", () => {
    const data = read("src/lib/company/attempt-data.ts");
    assert.match(data, /export async function attemptByLink[\s\S]{0,200}await finaliseDue\(sql, \{ candidateId \}\)/);
    assert.match(data, /export async function attemptsForBatch[\s\S]{0,200}await finaliseDue\(sql, \{ companyId, batchId \}\)/);
  });
});

describe("reviewing (H09)", async () => {
  const { readReviewForm, reviewState, scoreText, totals } = await import("../src/lib/company/review-rules");
  const rubric = [
    { title: "API", skill: "APIs", points: 4, guide: "g" },
    { title: "Data", skill: "SQL", points: 6, guide: "g" },
  ];
  const form = (v: Record<string, string>) => ({ get: (k: string) => v[k] ?? null });

  test("every criterion scored with whole points from 0 to its maximum", () => {
    const ok = readReviewForm(form({ "points-0": "4", "points-1": "0", "note-0": " fine ", summary: " good " }), rubric);
    assert.deepEqual(ok, { ok: true, scores: [{ points: 4, note: "fine" }, { points: 0, note: "" }], summary: "good", total: 4, max: 10 });
    const missing = readReviewForm(form({ "points-0": "4" }), rubric);
    assert.ok(!missing.ok && missing.errors[1] === "Score Data.");
    const over = readReviewForm(form({ "points-0": "5", "points-1": "2.5" }), rubric);
    assert.ok(!over.ok && /0 to 4/.test(over.errors[0]) && /0 to 6/.test(over.errors[1]));
    const long = readReviewForm(form({ "points-0": "1", "points-1": "1", summary: "x".repeat(2001) }), rubric);
    assert.ok(!long.ok && long.errors.summary);
  });

  test("totals, labels and where a review stands", () => {
    assert.deepEqual(totals([{ points: 3 }, { points: 2 }], rubric), { total: 5, max: 10 });
    assert.equal(scoreText(7, 10), "7 / 10");
    assert.equal(reviewState({ submitted: false, reviewed: false }), "none");
    assert.equal(reviewState({ submitted: true, reviewed: false }), "to_review");
    assert.equal(reviewState({ submitted: true, reviewed: true }), "scored");
  });

  test("submitted people can be filtered, and those not yet scored are To review", () => {
    const base = { active: true, delivery: "sent" as const, link: "open" as const, started: true };
    assert.deepEqual(candidateTags({ ...base, submitted: true }), ["all", "started", "submitted", "to_review", "sent"]);
    assert.deepEqual(candidateTags({ ...base, submitted: true, reviewed: true }), ["all", "started", "submitted", "sent"]);
  });

  test("the review page never reaches the candidate, and the download is forced and uncached", () => {
    const route = read("src/app/org/[slug]/(workspace)/assessments/[item]/candidates/[candidate]/files/[file]/route.ts");
    assert.match(route, /seesHiring\(member\)/);
    assert.match(route, /"content-disposition": `attachment;/);
    assert.match(route, /"cache-control": "private, no-store"/);
    const action = read("src/app/org/[slug]/(workspace)/assessments/[item]/candidates/[candidate]/actions.ts");
    assert.match(action, /canScore\(member\)/);
    assert.match(action, /reviewer: member\.email/, "the reviewer comes from the login");
    const receipt = read("src/app/assessment/[token]/page.tsx");
    assert.doesNotMatch(receipt, /attempt_reviews|loadReviewView|\.guide\b/, "the review itself never reaches the candidate's page");
    assert.match(receipt, /sharedResultFor\(/, "only a result a recruiter shared (H10)");
  });
});
