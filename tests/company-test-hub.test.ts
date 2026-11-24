import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";
import { funnel, hubTags, pickTests, takeUpText, testStatus } from "../src/lib/company/test-hub-view";

const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const ref = (version: number) => ({ version, id: `v${version}` });

describe("Assessments hub: tests", () => {
  test("status follows the company's standing", () => {
    assert.equal(testStatus({ latest: ref(2), latestReview: null, inUse: ref(1) }), "ongoing");
    assert.equal(testStatus({ latest: ref(1), latestReview: null, inUse: null }), "review");
    assert.equal(testStatus({ latest: null, latestReview: null, inUse: null }), "unpublished");
  });

  test("take-up sentence", () => {
    assert.equal(takeUpText(0, 0), "No candidates have been invited yet.");
    assert.equal(takeUpText(1, 1), "1 candidate has been invited and has taken the test.");
    assert.equal(takeUpText(3, 0), "3 candidates have been invited and none of them have taken the test yet.");
    assert.equal(takeUpText(19, 5), "19 candidates have been invited and 5 have taken the test.");
    assert.equal(takeUpText(19, 1), "19 candidates have been invited and 1 has taken the test.");
  });

  test("filter by status, search, creation date; sort", () => {
    const now = new Date("2026-11-24T00:00:00Z");
    const rows = [
      { status: "ongoing" as const, title: "Backend", role: "Engineer", publishedAt: "2026-11-20T00:00:00Z", invited: 2 },
      { status: "ongoing" as const, title: "Data", role: "Analyst", publishedAt: "2026-01-01T00:00:00Z", invited: 9 },
      { status: "review" as const, title: "Design", role: "Designer", publishedAt: "2026-11-23T00:00:00Z", invited: 0 },
    ];
    assert.deepEqual(pickTests(rows, "ongoing", "", "any", "newest", now).map((r) => r.title), ["Backend", "Data"]);
    assert.deepEqual(pickTests(rows, "ongoing", "", "any", "oldest", now).map((r) => r.title), ["Data", "Backend"]);
    assert.deepEqual(pickTests(rows, "ongoing", "", "any", "candidates", now).map((r) => r.title), ["Data", "Backend"]);
    assert.deepEqual(pickTests(rows, "ongoing", "", "30", "newest", now).map((r) => r.title), ["Backend"]);
    assert.deepEqual(pickTests(rows, "ongoing", "analyst", "any", "newest", now).map((r) => r.title), ["Data"]);
  });
});

describe("Assessments hub: candidates and funnel", () => {
  const base = { active: true, started: false, submitted: false, reviewed: false, passed: false };

  test("tags keep score, review and status apart", () => {
    assert.deepEqual(hubTags(base), ["invited", "not_started"]);
    assert.deepEqual(hubTags({ ...base, passed: true }), ["invited", "expired"]);
    assert.deepEqual(hubTags({ ...base, started: true }), ["invited", "progress"]);
    assert.deepEqual(hubTags({ ...base, started: true, submitted: true }), ["invited", "taken", "review"]);
    assert.deepEqual(hubTags({ ...base, started: true, submitted: true, reviewed: true }), ["invited", "taken", "reviewed"]);
    assert.deepEqual(hubTags({ ...base, active: false }), ["cancelled"]);
    assert.deepEqual(hubTags({ ...base, started: true, submitted: true, decision: "shortlisted" }), ["invited", "taken", "review", "shortlisted"], "a decision before a review");
    assert.deepEqual(hubTags({ ...base, started: true, decision: "shortlisted" }), ["invited", "progress"], "no decision without a submission");
    // Someone cancelled after starting still counts as someone who took part.
    assert.deepEqual(hubTags({ ...base, active: false, started: true, submitted: true }), ["invited", "taken", "review"]);
  });

  test("funnel counts recorded steps and leaves out cancelled people who never started", () => {
    const { steps, expired } = funnel([
      { ...base, opened: false },
      { ...base, opened: true, passed: true },
      { ...base, opened: false, started: true }, // a start counts as an opened link
      { ...base, opened: true, started: true, submitted: true },
      { ...base, opened: true, started: true, submitted: true, reviewed: true, decision: "shortlisted" },
      { ...base, active: false, opened: true },
    ]);
    assert.deepEqual(steps.map((s) => s.count), [5, 4, 3, 2, 1, 1]);
    assert.deepEqual(steps.map((s) => s.ofPrevious), [null, 80, 75, 67, 50, 100]);
    assert.equal(expired, 1);
    assert.deepEqual(funnel([]).steps.map((s) => s.ofPrevious), [null, null, null, null, null, null]);
  });
});

describe("Assessments hub: pages", () => {
  const page = read("src/app/org/[slug]/(workspace)/assessments/[item]/page.tsx");
  const list = read("src/app/org/[slug]/(workspace)/assessments/page.tsx");
  const data = read("src/lib/company/test-hub-data.ts");

  test("candidates and analysis show only to people who see hiring", () => {
    assert.match(page, /seesPeople \? \["overview", "questions", "settings", "candidates", "analysis"\] : \["overview", "questions", "settings"\]/);
    assert.match(list, /reportHref: seesPeople && /);
  });

  test("invite is for recruiters on an approved version, and preselects the test", () => {
    assert.match(list, /inviteHref: recruiter && s\.inUse && !blocked \?/, "and not while access is off or ended (U06a)");
    assert.match(page, /recruiter && standing\.inUse &&/);
    assert.match(read("src/components/company/BatchForm.tsx"), /tests\.find\(\(t\) => t\.item === initial\.test\)/);
  });

  test("every hub query is scoped to the company", () => {
    for (const q of data.split("sql.rows").slice(1, 3)) assert.match(q, /company_id = \$\{companyId\}::uuid/);
  });

  test("no threshold or automatic decision in the hub", () => {
    assert.doesNotMatch(page + list, /shortlist(ed)? automatically|cut-?off score/i);
  });
});

describe("Invite candidates: adding people from the company", async () => {
  const { addPeopleToList, parseCandidates, personLine } = await import("../src/lib/company/batch-rules");

  test("a picked person becomes a list line the parser reads back exactly, commas and quotes included", () => {
    for (const name of ["Asha Rao", "Rao, Asha", 'Asha "AR" Rao']) {
      const read = parseCandidates(personLine({ email: "asha@acme.test", name }));
      assert.deepEqual(read.candidates.map((c) => [c.name, c.email]), [[name, "asha@acme.test"]]);
    }
    assert.equal(personLine({ email: "ravi@acme.test", name: null }), "ravi, ravi@acme.test", "no name: the email's first part");
  });

  test("adding skips anyone already on the list, in any case, and keeps what was typed", () => {
    const out = addPeopleToList("Typed Person, typed@x.test\nASHA@acme.test, Asha", [
      { email: "asha@acme.test", name: "Asha" },
      { email: "ravi@acme.test", name: "Ravi" },
      { email: "ravi@acme.test", name: "Ravi again" },
    ]);
    assert.equal(out.added, 1);
    assert.equal(out.skipped, 2);
    assert.equal(out.list, "Typed Person, typed@x.test\nASHA@acme.test, Asha\nRavi, ravi@acme.test");
    assert.deepEqual(addPeopleToList("", []), { list: "", added: 0, skipped: 0 });
  });

  test("no separate Batches page: old links go to Assessments", () => {
    assert.match(read("src/app/org/[slug]/(workspace)/hiring/page.tsx"), /redirect\(`\/org\/\$\{slug\}\/assessments`\)/);
  });
});
