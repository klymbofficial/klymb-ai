import { strict as assert } from "node:assert";
import { test } from "node:test";
import { codeItem, type CatalogAssessment } from "../src/data/business-catalog";
import type { CompanyMember } from "../src/lib/company/access";
import {
  candidateTask,
  canReview,
  canWriteTests,
  readTestName,
  TEST_NAME_MAX,
  minutesLabel,
  parseLines,
  publishGaps,
  readContent,
  readReview,
  readRubric,
  sameContent,
  seesAssessments,
  standingLabel,
  standingOf,
  startingDraft,
  type AssessmentContent,
  type ReviewRow,
  type Version,
} from "../src/lib/company/assessment-rules";

const ready: AssessmentContent = {
  role: "Backend engineer",
  minutes: 60,
  submission: "written_file",
  toolsAllowed: ["Public documentation"],
  toolsNotAllowed: ["Help from another person"],
  instructions: "Write your design in the box. Upload one diagram.",
  taskTitle: "Design a parcel tracking API",
  taskBrief: "Couriers post scans; customers poll for status.\n\nSay how you store scans.",
  sampleTitle: "Design a ticket booking API",
  sampleBrief: "Stop two people booking one seat.",
  rubric: [
    { title: "Clear API", skill: "API design", points: 4, guide: "Full points: resources and errors named." },
    { title: "Storage", skill: "System design", points: 6, guide: "Full points: says why this store." },
  ],
  results: "by_area",
};

const raw = (over: Partial<Record<keyof AssessmentContent, unknown>> = {}) => ({
  ...ready,
  minutes: String(ready.minutes),
  toolsAllowed: ready.toolsAllowed.join("\n"),
  toolsNotAllowed: ready.toolsNotAllowed.join("\n"),
  ...over,
});

const member = (roles: CompanyMember["roles"]): CompanyMember =>
  ({ email: "x@co.test", companyId: "c", companySlug: "co", companyName: "Co", roles, teamId: null, leadTeamId: null });

test("the first draft starts from the catalog listing, with the real task and scoring guides left to write", () => {
  const code = codeItem("backend-design-practical") as CatalogAssessment;
  const d = startingDraft(code);
  assert.equal(d.revision, 0);
  assert.equal(d.role, code.role);
  assert.equal(d.minutes, code.minutes);
  assert.equal(d.sampleTitle, code.sampleTask.title);
  assert.deepEqual(d.rubric.map((r) => r.title), [...code.rubric]);
  assert.ok(d.rubric.every((r) => r.guide === ""), "no scoring rule is invented");
  assert.equal(d.taskTitle, "");
  assert.deepEqual(publishGaps(d), ["instructions for candidates", "the real task", "a name, skill and scoring guide for 5 rubric areas"]);
});

test("a complete draft reads back as typed, and has nothing missing", () => {
  const r = readContent(raw());
  assert.ok(r.ok);
  assert.deepEqual(r.value, ready);
  assert.deepEqual(publishGaps(r.value), []);
});

test("an unfinished draft saves, and says what is missing to publish", () => {
  const r = readContent(raw({ role: "", minutes: "", taskBrief: "  ", rubric: [{ title: "Clear API", skill: "", points: 4, guide: "" }] }));
  assert.ok(r.ok);
  assert.deepEqual(publishGaps(r.value), ["the role", "the time allowed", "the real task", "a name, skill and scoring guide for 1 rubric area"]);
  assert.ok(publishGaps({ ...ready, rubric: [] }).includes("at least one rubric area"));
});

test("the practice task must differ from the real one", () => {
  assert.ok(publishGaps({ ...ready, sampleTitle: "design a PARCEL tracking api" }).includes("a practice task that differs from the real one"));
});

test("fields that don't fit are refused before the database sees them", () => {
  const refused = (over: Parameters<typeof raw>[0]) => {
    const r = readContent(raw(over));
    assert.equal(r.ok, false, JSON.stringify(over).slice(0, 80));
  };
  refused({ minutes: "4" });
  refused({ minutes: "481" });
  refused({ minutes: "45.5" });
  refused({ submission: "video" });
  refused({ results: "everything" });
  refused({ role: "x".repeat(121) });
  refused({ toolsAllowed: "Docs", toolsNotAllowed: "docs" });
  refused({ rubric: "not a list" });
  refused({ rubric: Array.from({ length: 11 }, (_, i) => ({ title: `A${i}`, skill: "s", points: 1, guide: "g" })) });
  refused({ rubric: [{ title: "A", skill: "s", points: 0, guide: "g" }] });
  refused({ rubric: [{ title: "A", skill: "s", points: 11, guide: "g" }] });
  refused({ rubric: [{ title: "Same", skill: "s", points: 1, guide: "g" }, { title: "same", skill: "s", points: 1, guide: "g" }] });
});

test("tool lists are one per line, with blanks and repeats dropped", () => {
  assert.deepEqual(parseLines("  Docs \n\nDocs\r\nA   drawing tool\n"), ["Docs", "A drawing tool"]);
});

test("publishing the same content as the newest version is spotted", () => {
  assert.equal(sameContent(ready, { ...ready, rubric: ready.rubric.map((r) => ({ ...r })) }), true);
  assert.equal(sameContent(ready, { ...ready, minutes: 45 }), false);
  assert.equal(sameContent(ready, { ...ready, rubric: [...ready.rubric].reverse() }), false, "reordering the rubric is a change");
});

test("a candidate never gets the scoring guide", () => {
  const v: Version = { ...ready, minutes: 60, id: "v", slug: "s", version: 3, title: "Backend design practical", publishedBy: "k", publishedAt: "2026-11-23T00:00:00.000Z" };
  const t = candidateTask(v);
  assert.deepEqual(t.areas, [{ title: "Clear API", points: 4 }, { title: "Storage", points: 6 }]);
  assert.ok(!JSON.stringify(t).includes("Full points"), "no guide text anywhere");
  assert.ok(!("rubric" in t));
});

test("a stored rubric that is malformed is left out, not half shown", () => {
  assert.deepEqual(readRubric([{ title: "A", skill: "s", points: 2, guide: "g" }, { title: "B" }, null, "x"]), [{ title: "A", skill: "s", points: 2, guide: "g" }]);
  assert.deepEqual(readRubric("nope"), []);
});

test("a decline needs a note; an approval doesn't", () => {
  assert.deepEqual(readReview({ decision: "approved", note: "  " }), { ok: true, value: { decision: "approved", note: null } });
  assert.equal(readReview({ decision: "declined", note: "" }).ok, false);
  assert.deepEqual(readReview({ decision: "declined", note: " Shorter brief " }), { ok: true, value: { decision: "declined", note: "Shorter brief" } });
  assert.equal(readReview({ decision: "maybe", note: "" }).ok, false);
  assert.equal(readReview({ decision: "declined", note: "x".repeat(1001) }).ok, false);
});

test("recruiters use the newest approved version; a newer one waits for its own approval", () => {
  const versions = [{ version: 1, id: "a" }, { version: 2, id: "b" }, { version: 3, id: "c" }];
  const review = (versionId: string, decision: ReviewRow["decision"]): [string, ReviewRow] => [versionId, { versionId, decision, note: null, decidedBy: "r", decidedAt: "" }];

  let s = standingOf(versions, new Map([review("a", "approved")]));
  assert.deepEqual([s.latest?.version, s.latestReview, s.inUse?.version], [3, null, 1]);
  assert.equal(standingLabel(s), "Version 3 waiting for review · version 1 in use");

  s = standingOf(versions, new Map([review("a", "approved"), review("c", "declined")]));
  assert.equal(standingLabel(s), "Version 3 declined · version 1 in use");

  s = standingOf(versions, new Map([review("a", "approved"), review("b", "approved"), review("c", "approved")]));
  assert.equal(s.inUse?.version, 3);
  assert.equal(standingLabel(s), "Approved · version 3");

  assert.equal(standingLabel(standingOf(versions, new Map())), "Version 3 waiting for review");
  assert.equal(standingLabel(standingOf([], new Map())), "Not published yet");
});

test("only hiring people and the workspace's runners open tests; only reviewers decide", () => {
  for (const r of ["admin", "company_head", "recruiter", "reviewer"] as const) assert.equal(seesAssessments(member([r])), true, r);
  for (const r of ["team_lead", "employee"] as const) assert.equal(seesAssessments(member([r])), false, r);
  assert.equal(seesAssessments(null), false);
  assert.equal(canReview(member(["reviewer"])), true);
  assert.equal(canReview(member(["admin", "recruiter"])), false, "an admin grants themselves reviewer to decide");
});

test("time reads in hours and minutes", () => {
  assert.equal(minutesLabel(45), "45 minutes");
  assert.equal(minutesLabel(60), "1 hour");
  assert.equal(minutesLabel(90), "1 hour 30 minutes");
  assert.equal(minutesLabel(121), "2 hours 1 minute");
});

test("company tests: admins, heads and recruiters write them; a reviewer, team lead or employee doesn't (U04a)", () => {
  for (const r of ["admin", "company_head", "recruiter"] as const) assert.equal(canWriteTests(member([r])), true, r);
  for (const r of ["reviewer", "team_lead", "employee"] as const) assert.equal(canWriteTests(member([r])), false, r);
  assert.equal(canWriteTests(null), false);
});

test("a company test's name is one required line, within the limit", () => {
  assert.deepEqual(readTestName("  Backend \n take-home "), { ok: true, value: "Backend take-home" });
  assert.equal(readTestName("   ").ok, false);
  assert.equal(readTestName(undefined).ok, false);
  assert.equal(readTestName("x".repeat(TEST_NAME_MAX)).ok, true);
  assert.equal(readTestName("x".repeat(TEST_NAME_MAX + 1)).ok, false);
});
