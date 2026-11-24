import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";
import { readCandidateToken, signCandidateToken } from "../src/lib/company/batch-link";
import {
  AUTO_REMIND_ATTEMPTS, DELIVERY_LABEL, MAIL_OUTCOME_LABEL, SENT_MEANS, canRetry, canSchedule, deadlineText, durationText, formatInZone, lastStart, linkState, parseCandidates, passedNote, readBatchForm, readExtension, seesHiring,
  reminderSummary, startPassed, toZonedInput, zonedToUtc, type ApprovedTest,
} from "../src/lib/company/batch-rules";
import type { CompanyMember } from "../src/lib/company/access";

const member = (roles: CompanyMember["roles"]) => ({ email: "x@acme.test", companyId: "c", companySlug: "acme", companyName: "Acme", roles, leadTeamId: null, teamId: null }) as unknown as CompanyMember;

describe("who runs hiring", () => {
  test("recruiters schedule; admins and company heads only look", () => {
    assert.equal(canSchedule(member(["recruiter"])), true);
    assert.equal(canSchedule(member(["admin"])), false);
    assert.equal(seesHiring(member(["company_head"])), true);
    assert.equal(seesHiring(member(["reviewer"])), true, "reviewers open batches to score (H09)");
    assert.equal(seesHiring(member(["employee"])), false);
  });
});

describe("time zones", () => {
  test("a wall-clock time in a zone becomes the right instant", () => {
    assert.equal(zonedToUtc("2026-12-04T18:00", "Asia/Kolkata")?.toISOString(), "2026-12-04T12:30:00.000Z");
    assert.equal(zonedToUtc("2026-07-01T09:00", "America/New_York")?.toISOString(), "2026-07-01T13:00:00.000Z", "summer time");
    assert.equal(zonedToUtc("2026-12-01T09:00", "America/New_York")?.toISOString(), "2026-12-01T14:00:00.000Z", "winter time");
    assert.equal(zonedToUtc("2026-02-30T09:00", "UTC"), null, "not a real date");
    assert.equal(zonedToUtc("tomorrow", "UTC"), null);
    assert.equal(zonedToUtc("2026-12-04T18:00", "Mars/Olympus"), null);
  });

  test("round-trips through the form's value", () => {
    const at = zonedToUtc("2026-12-04T18:00", "Asia/Kolkata")!;
    assert.equal(toZonedInput(at, "Asia/Kolkata"), "2026-12-04T18:00");
    assert.equal(toZonedInput(at, "UTC"), "2026-12-04T12:30");
  });

  test("candidates read the deadline with its zone named", () => {
    const at = "2026-12-04T12:30:00.000Z";
    assert.equal(formatInZone(at, "Asia/Kolkata"), "Fri 4 Dec 2026, 6:00 pm");
    assert.equal(deadlineText(at, "Asia/Kolkata"), "Fri 4 Dec 2026, 6:00 pm India Standard Time");
  });

  test("durations read in words", () => {
    assert.equal(durationText(90), "1 hour 30 minutes");
    assert.equal(durationText(60), "1 hour");
    assert.equal(durationText(45), "45 minutes");
  });
});

describe("the last start", () => {
  const batch = { closesAt: "2026-12-04T12:30:00.000Z", minutes: 60 };

  test("is closing minus the time allowed, extra minutes included", () => {
    assert.equal(lastStart(batch, { extraMinutes: 0, lastStartAt: null }).toISOString(), "2026-12-04T11:30:00.000Z");
    assert.equal(lastStart(batch, { extraMinutes: 30, lastStartAt: null }).toISOString(), "2026-12-04T11:00:00.000Z", "more time means starting earlier");
  });

  test("an extension's own last start wins", () => {
    assert.equal(lastStart(batch, { extraMinutes: 0, lastStartAt: "2026-12-06T10:00:00.000Z" }).toISOString(), "2026-12-06T10:00:00.000Z");
  });

  test("only an open link can start", () => {
    const base = { batchStatus: "sent", candidateStatus: "active", opensAt: "2026-12-01T00:00:00Z", lastStart: new Date("2026-12-04T11:30:00Z") };
    assert.equal(linkState({ ...base, now: new Date("2026-11-30T00:00:00Z") }), "not_open");
    assert.equal(linkState({ ...base, now: new Date("2026-12-02T00:00:00Z") }), "open");
    assert.equal(linkState({ ...base, now: new Date("2026-12-04T11:31:00Z") }), "missed");
    assert.equal(linkState({ ...base, candidateStatus: "cancelled", now: new Date("2026-12-02T00:00:00Z") }), "cancelled");
    assert.equal(linkState({ ...base, batchStatus: "cancelled", now: new Date("2026-12-02T00:00:00Z") }), "batch_cancelled");
    assert.equal(linkState({ ...base, batchStatus: "draft", now: new Date("2026-12-02T00:00:00Z") }), "draft");
  });
});

describe("the candidate list", () => {
  test("reads name and email in either order, with optional extra minutes", () => {
    const { candidates, problems } = parseCandidates("Asha Rao, Asha@Example.com\nravi@example.com, Ravi Menon, 30\nMeera K\tmeera@example.com");
    assert.deepEqual(problems, []);
    assert.deepEqual(candidates, [
      { name: "Asha Rao", email: "asha@example.com", extraMinutes: 0 },
      { name: "Ravi Menon", email: "ravi@example.com", extraMinutes: 30 },
      { name: "Meera K", email: "meera@example.com", extraMinutes: 0 },
    ]);
  });

  test("uses a CSV header when there is one", () => {
    const { candidates } = parseCandidates("email,name,extra minutes\nasha@example.com,\"Rao, Asha\",15\n");
    assert.deepEqual(candidates, [{ name: "Rao, Asha", email: "asha@example.com", extraMinutes: 15 }]);
  });

  test("points at each bad line and keeps the first of a duplicate", () => {
    const { candidates, problems } = parseCandidates("Asha, asha@example.com\nAsha again, ASHA@example.com\nNo Email\nbob@example.com\nCara, cara@example.com, 999");
    assert.equal(candidates.length, 1);
    assert.deepEqual(problems.map((p) => p.line), [2, 3, 4, 5]);
    assert.match(problems[0].message, /twice/);
    assert.match(problems[2].message, /Add a name/);
    assert.match(problems[3].message, /0 to 480/);
  });

  test("refuses more than 200 people", () => {
    const list = Array.from({ length: 201 }, (_, i) => `P${i}, p${i}@example.com`).join("\n");
    const { candidates, problems } = parseCandidates(list);
    assert.equal(candidates.length, 0);
    assert.match(problems[0].message, /at most 200/);
  });
});

describe("the batch form", () => {
  const now = new Date("2026-11-23T06:00:00Z");
  const tests: ApprovedTest[] = [{ item: "backend", title: "Backend practical", versionId: "v2", version: 2, minutes: 90, role: "Backend engineer" }];
  const ctx = { now, tests, reviewers: ["rev@acme.test"], prepCourses: ["system-design"] };
  const form = {
    versionId: "v2", role: "Backend engineer", prepCourse: "system-design", reviewer: "REV@acme.test", timeZone: "Asia/Kolkata",
    opens: "2026-11-24T10:00", closes: "2026-12-01T18:00", candidates: "Asha, asha@example.com",
  };

  test("accepts a good batch, with times read in its zone", () => {
    const r = readBatchForm(form, ctx);
    assert.ok(r.ok);
    assert.equal(r.value.opensAt.toISOString(), "2026-11-24T04:30:00.000Z");
    assert.equal(r.value.reviewer, "rev@acme.test");
    assert.equal(r.value.prepCourse, "system-design");
  });

  test("only an approved version, a reviewer and a course in the plan", () => {
    const r = readBatchForm({ ...form, versionId: "v1", reviewer: "someone@acme.test", prepCourse: "dsa" }, ctx);
    assert.ok(!r.ok);
    assert.deepEqual(Object.keys(r.errors).sort(), ["prep", "reviewer", "test"]);
  });

  test("the window must leave everyone their full time", () => {
    const short = readBatchForm({ ...form, opens: "2026-11-24T10:00", closes: "2026-11-24T11:00" }, ctx);
    assert.ok(!short.ok);
    assert.match(short.errors.closes!, /too short/);
    const extra = readBatchForm({ ...form, closes: "2026-11-24T11:45", candidates: "Asha, asha@example.com, 30" }, ctx);
    assert.ok(!extra.ok, "two hours allowed with extra time doesn't fit in 1 hour 45");
    const passed = readBatchForm({ ...form, opens: "2026-11-20T10:00", closes: "2026-11-23T12:00" }, ctx);
    assert.ok(!passed.ok, "with 90 minutes, nobody can start before 12:00 India time at 11:30 now");
    assert.match(passed.errors.closes!, /nobody could start/);
  });

  test("a list with any bad line isn't saved", () => {
    const r = readBatchForm({ ...form, candidates: "Asha, asha@example.com\nnot an email" }, ctx);
    assert.ok(!r.ok);
    assert.equal(r.problems.length, 1);
    assert.match(r.errors.candidates!, /Fix 1 line/);
  });
});

describe("one person's extension", () => {
  const ctx = { now: new Date("2026-11-23T06:00:00Z"), timeZone: "Asia/Kolkata", closesAt: "2026-12-01T12:30:00.000Z", minutes: 60 };

  test("extra minutes alone keep the batch's rule", () => {
    assert.deepEqual(readExtension({ extraMinutes: "30", lastStart: "" }, ctx), { ok: true, value: { extraMinutes: 30, lastStartAt: null } });
  });

  test("a last start must be later than the usual one", () => {
    const early = readExtension({ extraMinutes: "0", lastStart: "2026-12-01T17:00" }, ctx);
    assert.ok(!early.ok, "17:00 is the usual last start for 60 minutes closing at 18:00");
    const later = readExtension({ extraMinutes: "0", lastStart: "2026-12-02T10:00" }, ctx);
    assert.ok(later.ok);
    assert.equal(later.value.lastStartAt?.toISOString(), "2026-12-02T04:30:00.000Z");
    assert.ok(!readExtension({ extraMinutes: "-5", lastStart: "" }, ctx).ok);
  });
  test("with no later last start, the batch's rule must still leave time to start", () => {
    // Closing 18:00 IST with 60 minutes: usual last start 17:00 IST (11:30Z).
    const late = { ...ctx, now: new Date("2026-12-01T11:30:00Z") };
    const r = readExtension({ extraMinutes: "0", lastStart: "" }, late);
    assert.ok(!r.ok, "exactly at the last start is too late: the email would carry a dead link");
    assert.match(r.message, /already passed/);
    assert.ok(!readExtension({ extraMinutes: "30", lastStart: "" }, { ...ctx, now: new Date("2026-12-01T11:00:00Z") }).ok, "30 more minutes moves the last start to 16:30 IST, already past");
    assert.ok(readExtension({ extraMinutes: "0", lastStart: "" }, { ...ctx, now: new Date("2026-12-01T11:29:00Z") }).ok, "a minute before is still fine");
    const revived = readExtension({ extraMinutes: "0", lastStart: "2026-12-02T10:00" }, late);
    assert.ok(revived.ok, "a later last start is the way back");
  });
});

describe("a send after the last start", () => {
  // Closes 18:00 IST (12:30Z), 60 minutes: usual last start 17:00 IST (11:30Z).
  const b = { closesAt: "2026-12-01T12:30:00.000Z", minutes: 60 };
  const at = (iso: string) => new Date(iso);

  test("the boundary: a minute before can still start, exactly at or after can't", () => {
    const usual = { extraMinutes: 0, lastStartAt: null };
    assert.equal(startPassed(b, usual, at("2026-12-01T11:29:00Z")), false);
    assert.equal(startPassed(b, usual, at("2026-12-01T11:30:00Z")), true, "exactly at the last start");
    assert.equal(startPassed(b, usual, at("2026-12-01T11:31:00Z")), true);
  });

  test("the audit's case: a draft sent at 17:30 for a 60-minute test closing at 18:00", () => {
    assert.equal(startPassed(b, { extraMinutes: 0, lastStartAt: null }, at("2026-12-01T12:00:00Z")), true, "closing hasn't passed, but nobody could start in time");
  });

  test("extra minutes bring one person's last start earlier", () => {
    const now = at("2026-12-01T11:10:00Z");
    assert.equal(startPassed(b, { extraMinutes: 0, lastStartAt: null }, now), false, "usual: 11:30Z");
    assert.equal(startPassed(b, { extraMinutes: 30, lastStartAt: null }, now), true, "with 30 extra: 11:00Z");
  });

  test("a later last start from an extension wins over the batch's rule", () => {
    const now = at("2026-12-01T13:00:00Z");
    assert.equal(startPassed(b, { extraMinutes: 0, lastStartAt: null }, now), true);
    assert.equal(startPassed(b, { extraMinutes: 0, lastStartAt: "2026-12-02T04:30:00Z" }, now), false);
    assert.equal(startPassed(b, { extraMinutes: 0, lastStartAt: "2026-12-01T12:59:00Z" }, now), true, "an extension that has itself passed");
  });

  test("a mixed batch: only the people who can still start are sent", () => {
    const now = at("2026-12-01T11:10:00Z");
    const people = [
      { name: "usual", extraMinutes: 0, lastStartAt: null },
      { name: "extra", extraMinutes: 30, lastStartAt: null },
      { name: "extended", extraMinutes: 30, lastStartAt: "2026-12-02T04:30:00Z" },
    ];
    assert.deepEqual(people.filter((p) => !startPassed(b, p, now)).map((p) => p.name), ["usual", "extended"]);
  });

  test("the note names how many and the way back", () => {
    assert.equal(passedNote(0), "");
    assert.match(passedNote(1), /^1 person wasn't sent: their time to start has passed\. Use Change time/);
    assert.match(passedNote(3), /^3 people weren't sent/);
  });

  test("every claim that emails a link checks the last start in SQL, the same way lastStart does", () => {
    const src = readFileSync(new URL("../src/lib/company/batch-data.ts", import.meta.url), "utf8");
    const body = (name: string) => {
      const start = src.indexOf(`export async function ${name}(`);
      assert.ok(start >= 0, name);
      const next = src.indexOf("\nexport ", start + 1);
      return src.slice(start, next < 0 ? undefined : next);
    };
    const rule = "b.closes_at - make_interval(mins => v.minutes + ";
    for (const name of ["startSending", "claimRetry", "claimChange", "claimReminders", "claimAutoReminders"]) {
      const sql = body(name);
      assert.ok(sql.includes(rule), `${name} computes the last start`);
      assert.match(sql, /\) > now\(\)|between now\(\)/, `${name} requires it ahead of now`);
      assert.ok(sql.includes("join course.assessment_versions v"), `${name} reads the version's minutes`);
    }
    const send = body("startSending");
    assert.ok(send.includes("exists (select 1 from eligible)"), "a batch nobody can start stays a draft");
    assert.ok(send.includes("c.id in (select id from eligible)"), "only eligible people are claimed");
  });
});

describe("retrying a delivery", () => {
  const now = new Date("2026-11-23T06:00:00Z");
  test("failed or skipped can be retried; one being sent can't, unless it's stuck", () => {
    assert.equal(canRetry({ delivery: "failed", claimedAt: null }, now), true);
    assert.equal(canRetry({ delivery: "skipped", claimedAt: null }, now), true);
    assert.equal(canRetry({ delivery: "sent", claimedAt: null }, now), false);
    assert.equal(canRetry({ delivery: "sending", claimedAt: "2026-11-23T05:58:00Z" }, now), false);
    assert.equal(canRetry({ delivery: "sending", claimedAt: "2026-11-23T05:40:00Z" }, now), true);
  });
});

describe("the private link", () => {
  const id = "0b3c1f6e-2d4a-4c5b-9e8f-1a2b3c4d5e6f";
  test("reads back only with the right secret, id and generation", () => {
    const token = signCandidateToken("secret-a", id, 1);
    assert.deepEqual(readCandidateToken("secret-a", token), { id, generation: 1 });
    assert.equal(readCandidateToken("secret-b", token), null, "another server's secret");
    assert.equal(readCandidateToken("secret-a", token.replace(".1.", ".2.")), null, "a generation it wasn't signed for");
    assert.equal(readCandidateToken("secret-a", `${token}x`), null);
    assert.equal(readCandidateToken("secret-a", "nonsense"), null);
  });

  test("the same row and generation always give the same link; a new generation a new one", () => {
    assert.equal(signCandidateToken("s", id, 1), signCandidateToken("s", id, 1));
    assert.notEqual(signCandidateToken("s", id, 1), signCandidateToken("s", id, 2));
  });
});

describe("what a recruiter is told about an email", () => {
  test("accepted by the mail service reads as Sent, never Delivered", () => {
    assert.equal(DELIVERY_LABEL.sent, "Sent");
    assert.equal(DELIVERY_LABEL.skipped, "Not sent", "the mail service declined it, so it never went out");
    assert.equal(DELIVERY_LABEL.pending, "Not sent");
    assert.deepEqual(MAIL_OUTCOME_LABEL, { sent: "sent", failed: "failed", skipped: "not sent" });
    for (const label of [...Object.values(DELIVERY_LABEL), ...Object.values(MAIL_OUTCOME_LABEL)]) assert.doesNotMatch(label, /deliver/i);
    assert.match(SENT_MEANS, /doesn't confirm it reached their inbox/);
  });

  test("no hiring screen, action or candidate page claims delivery", () => {
    const files = [
      "../src/app/org/[slug]/(workspace)/hiring/page.tsx",
      "../src/app/org/[slug]/(workspace)/hiring/[batch]/page.tsx",
      "../src/app/org/[slug]/(workspace)/hiring/new/page.tsx",
      "../src/app/org/[slug]/(workspace)/hiring/actions.ts",
      "../src/components/company/BatchControls.tsx",
      "../src/components/company/BatchForm.tsx",
      "../src/components/company/BatchList.tsx",
      "../src/components/company/CandidateTable.tsx",
      "../src/app/assessment/[token]/page.tsx",
    ];
    for (const f of files) {
      const src = readFileSync(new URL(f, import.meta.url), "utf8");
      // "Delivered" is the claim nothing here can back. Column and field names (delivered_at, deliveredAt) are fine.
      assert.doesNotMatch(src.replace(/delivered_at|deliveredAt/g, ""), /delivered/i, f);
    }
    const page = readFileSync(new URL("../src/app/org/[slug]/(workspace)/hiring/[batch]/page.tsx", import.meta.url), "utf8");
    assert.ok(page.includes("{SENT_MEANS}"), "the batch page explains what Sent means");
  });
});

describe("reminders, as the mail log tells it", () => {
  type Row = Parameters<typeof reminderSummary>[0][number];
  const row = (kind: Row["kind"], outcome: Row["outcome"], error: string | null = null): Row => ({ kind, outcome, error });

  test("nothing logged: nothing claimed", () => {
    assert.deepEqual(reminderSummary([]), { manual: 0, autoSent: false, autoFailed: null });
  });

  test("only reminders that went out count; a claim or a failure doesn't", () => {
    const s = reminderSummary([row("reminder", "failed", "x"), row("reminder", "sent"), row("invite", "sent"), row("reminder", "sent")]);
    assert.equal(s.manual, 2);
  });

  test("a failed automatic reminder is reported with its reason, until one goes out", () => {
    assert.deepEqual(reminderSummary([row("auto_reminder", "failed", "Mailbox full")]).autoFailed, { outcome: "failed", error: "Mailbox full" });
    assert.deepEqual(reminderSummary([row("auto_reminder", "skipped", "Unsubscribed")]).autoFailed, { outcome: "skipped", error: "Unsubscribed" });
    const later = reminderSummary([row("auto_reminder", "sent"), row("auto_reminder", "failed", "x")]);
    assert.deepEqual([later.autoSent, later.autoFailed], [true, null], "newest first: the retry went out");
  });

  test("the automatic claim retries failures, reclaims stale claims, stops after a cap, and never repeats a sent one", () => {
    assert.equal(AUTO_REMIND_ATTEMPTS, 3);
    const src = readFileSync(new URL("../src/lib/company/batch-data.ts", import.meta.url), "utf8");
    const claim = src.slice(src.indexOf("export async function claimAutoReminders("), src.indexOf("export async function recordMail("));
    assert.ok(claim.includes("c.auto_reminded_at < now() - ${STALE}::interval"), "stale claims come back");
    assert.ok(claim.includes("l.kind = 'auto_reminder' and l.outcome = 'sent'"), "one that went out never repeats");
    assert.ok(claim.includes("< ${AUTO_REMIND_ATTEMPTS}"), "attempts are capped");
    const record = src.slice(src.indexOf("export async function recordMail("));
    assert.ok(record.includes("set auto_reminded_at = null"), "a failed automatic reminder releases its claim");
    const page = readFileSync(new URL("../src/app/org/[slug]/(workspace)/hiring/[batch]/page.tsx", import.meta.url), "utf8");
    assert.doesNotMatch(page, /autoRemindedAt|remindersSent/, "the page reads outcomes, not claim stamps");
  });
});
