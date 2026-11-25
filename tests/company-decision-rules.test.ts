import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";
import type { CompanyMember } from "../src/lib/company/access";
import { canDecide, canScore } from "../src/lib/company/batch-rules";
import { candidateTags } from "../src/lib/company/batch-view";
import { candidateResult, readDecisionForm } from "../src/lib/company/review-rules";

const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const member = (roles: CompanyMember["roles"]) => ({ email: "x@acme.test", companyId: "c", companySlug: "acme", companyName: "Acme", roles, leadTeamId: null, teamId: null }) as unknown as CompanyMember;
const form = (v: Record<string, string>) => ({ get: (k: string) => v[k] ?? null });

describe("H10: hiring decisions", () => {
  test("recruiters and company heads decide; reviewers score; admins do everything (25 Nov); employees do neither", () => {
    assert.equal(canDecide(member(["recruiter"])), true);
    assert.equal(canDecide(member(["company_head"])), true);
    assert.equal(canDecide(member(["reviewer"])), false);
    assert.equal(canDecide(member(["admin"])), true, "a company admin holds every power");
    assert.equal(canScore(member(["admin"])), true);
    assert.equal(canDecide(member(["employee"])), false);
    assert.equal(canScore(member(["recruiter"])), false);
  });

  test("a decision needs one of three choices and a reason", () => {
    assert.deepEqual(readDecisionForm(form({ decision: "shortlisted", reason: "  Strong design.\r\n" })), { ok: true, decision: "shortlisted", reason: "Strong design." });
    assert.equal(readDecisionForm(form({ decision: "hired", reason: "x" })).ok, false);
    assert.equal(readDecisionForm(form({ decision: "on_hold", reason: "   " })).ok, false);
    assert.equal(readDecisionForm(form({ decision: "not_shortlisted", reason: "x".repeat(1001) })).ok, false);
    const both = readDecisionForm(form({}));
    assert.ok(!both.ok && both.errors.decision && both.errors.reason);
  });

  test("the decision is its own filter, only after a submission, never from the score", () => {
    const base = { active: true, delivery: "sent" as const, link: "open" as const, started: true, submitted: true };
    assert.ok(candidateTags({ ...base, reviewed: true }).every((t) => t !== "shortlisted"), "a review alone doesn't shortlist");
    assert.ok(candidateTags({ ...base, reviewed: false, decision: "shortlisted" }).includes("shortlisted"));
    assert.ok(candidateTags({ ...base, reviewed: false, decision: "shortlisted" }).includes("to_review"), "decided before review still shows To review");
    assert.ok(!candidateTags({ ...base, submitted: false, decision: "shortlisted" }).includes("shortlisted"));
  });
});

describe("H10: what a candidate sees", () => {
  const review = { total: 7, max: 10, scores: [{ title: "API", points: 3, max: 4, note: "secret" }, { title: "Data", points: 4, max: 6, note: "" }] };

  test("overall shows the total only; by area adds titles and points; never notes", () => {
    const overall = candidateResult({ policy: "overall", sharedAt: "t" }, review);
    assert.deepEqual(overall, { policy: "overall", total: 7, max: 10, areas: null, sharedAt: "t" });
    const byArea = candidateResult({ policy: "by_area", sharedAt: "t" }, review);
    assert.deepEqual(byArea.areas, [{ title: "API", points: 3, max: 4 }, { title: "Data", points: 4, max: 6 }]);
    assert.doesNotMatch(JSON.stringify(byArea), /secret|note/);
  });

  test("the candidate page shows only the shared result: no decision, no reviewer notes, no guides", () => {
    const page = read("src/app/assessment/[token]/page.tsx");
    assert.match(page, /sharedResultFor\(/);
    assert.doesNotMatch(page, /DECISION_LABEL|decisionHistory|hiring_decisions|\.guide\b|\.summary\b|\.note\b/);
  });

  test("no threshold anywhere in decisions: the SQL and the page never compare a total", () => {
    const sql = read("db/migrations/0059_hiring_decisions.sql");
    const fn = sql.slice(sql.indexOf("create or replace function course.record_decision"), sql.indexOf("create or replace function course.share_result"));
    assert.doesNotMatch(fn, /total|threshold|cut.?off/i);
    const panel = read("src/components/company/DecisionPanel.tsx");
    assert.doesNotMatch(panel, /total|threshold|cut.?off/i);
  });
});

describe("U11: tests sent to colleagues", async () => {
  const { readBatchForm } = await import("../src/lib/company/batch-rules");
  const { navGroupsFor } = await import("../src/lib/company/nav");
  const now = new Date("2026-11-24T00:00:00Z");
  const ctx = { now, tests: [{ item: "t", title: "T", versionId: "v", version: 1, minutes: 60, role: "Engineer" }], reviewers: ["r@acme.test"], prepCourses: [] };
  const raw = { versionId: "v", role: "Team check", reviewer: "r@acme.test", timeZone: "UTC", opens: "2026-11-25T10:00", closes: "2026-11-27T10:00", candidates: "Asha, asha@acme.test" };

  test("a round is Hiring unless the form says Internal", () => {
    const hiring = readBatchForm(raw, ctx);
    assert.ok(hiring.ok && hiring.value.purpose === "hiring");
    const internal = readBatchForm({ ...raw, purpose: "internal" }, ctx);
    assert.ok(internal.ok && internal.value.purpose === "internal");
    const odd = readBatchForm({ ...raw, purpose: "hired" }, ctx);
    assert.ok(odd.ok && odd.value.purpose === "hiring");
  });

  test("My assessments shows in the sidebar only for someone sent a test", () => {
    const has = (on: boolean) => navGroupsFor(member(["employee"]), { myAssessments: on }).flatMap((g) => g.items.map((i) => i.label));
    assert.ok(has(true).includes("My assessments"));
    assert.ok(!has(false).includes("My assessments"));
  });

  test("opening my test checks it's mine (company + work email) and builds the link on the server", () => {
    const route = read("src/app/org/[slug]/(workspace)/my-assessments/open/[invite]/route.ts");
    assert.match(route, /myInvitation\(sql, member\.companyId, member\.email, invite\)/);
    assert.match(route, /signCandidateToken\(secret, mine\.id, mine\.generation\)/);
    const data = read("src/lib/company/my-assessments.ts");
    for (const q of data.split("sql.").slice(1)) assert.match(q, /c\.company_id = \$\{companyId\}::uuid and c\.email = lower\(\$\{email\}\)/);
    assert.match(read("db/migrations/0060_round_purpose.sql"), /b\.purpose = 'internal'[\s\S]*'internal'::text/);
  });
});
