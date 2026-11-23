import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";
import type { CompanyMember } from "../src/lib/company/access";
import { BATCH_FILTERS, batchStateKey, candidateTags, countBy, CANDIDATE_FILTERS, pickBatches, pickCandidates } from "../src/lib/company/batch-view";
import { isCurrent, navGroupsFor } from "../src/lib/company/nav";

const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const member = (roles: CompanyMember["roles"], over: Partial<CompanyMember> = {}) =>
  ({ email: "x@acme.test", companyId: "c", companySlug: "acme", companyName: "Acme", roles, leadTeamId: null, teamId: null, ...over }) as unknown as CompanyMember;
const shape = (m: CompanyMember) => navGroupsFor(m).map((g) => [g.label, g.items.map((i) => i.label)]);

describe("the sidebar's sections", () => {
  test("an employee sees two plain links, no group names", () => {
    assert.deepEqual(shape(member(["employee"])), [[null, ["Overview"]], [null, ["My learning"]]]);
  });

  test("a recruiter's hiring links sit under Hiring; the open batches page is called Batches", () => {
    const groups = navGroupsFor(member(["recruiter"]));
    const hiring = groups.find((g) => g.label === "Hiring");
    assert.ok(hiring, "named, since there is more than one group");
    assert.deepEqual(hiring.items.map((i) => [i.label, i.href]), [["Assessments", "/org/acme/assessments"], ["Batches", "/org/acme/hiring"]]);
    assert.ok(!groups.some((g) => g.items.some((i) => i.label === "People" || i.label === "Branding")), "people and branding are for admins");
  });

  test("an admin gets every section, in order: overview, workforce, hiring, company", () => {
    assert.deepEqual(shape(member(["admin"])), [
      [null, ["Overview"]],
      ["Workforce", ["People", "Teams", "Learning"]],
      ["Hiring", ["Assessments", "Batches"]],
      ["Company", ["Catalog", "Branding"]],
    ]);
  });

  test("roles add up, and every link stays inside this company's workspace", () => {
    const groups = navGroupsFor(member(["employee", "recruiter"]));
    for (const g of groups) for (const i of g.items) assert.ok(i.href === "/org/acme" || i.href.startsWith("/org/acme/"), i.href);
    assert.ok(groups.some((g) => g.items.some((i) => i.label === "Batches")));
  });

  test("the overview is current only on itself; a section also on the pages under it", () => {
    assert.equal(isCurrent("/org/acme", "/org/acme", "/org/acme"), true);
    assert.equal(isCurrent("/org/acme", "/org/acme/hiring", "/org/acme"), false);
    assert.equal(isCurrent("/org/acme/hiring", "/org/acme/hiring/123", "/org/acme"), true);
    assert.equal(isCurrent("/org/acme/hiring", "/org/acme/hiringx", "/org/acme"), false);
  });

  test("the workspace frame is the sidebar, with the company's brand and support contact", () => {
    const layout = read("src/app/org/[slug]/(workspace)/layout.tsx");
    assert.match(layout, /groups=\{navGroupsFor\(member\)\}/);
    assert.doesNotMatch(layout, /OrgHeader/);
    const sidebar = read("src/components/company/OrgSidebar.tsx");
    assert.match(sidebar, /aria-current=\{current \? "page" : undefined\}/);
    assert.match(sidebar, /aria-expanded=\{open\}/);
    assert.match(sidebar, /e\.key !== "Escape"/, "the phone drawer closes on Escape");
    assert.match(sidebar, /action=\{signOutOfCompany\}/);
  });
});

describe("the batch list's filters", () => {
  const now = new Date("2026-11-25T06:00:00Z");
  test("each batch falls under exactly one status", () => {
    const at = (o: string, c: string, status: "draft" | "sent" | "cancelled" = "sent") => batchStateKey({ status, opensAt: o, closesAt: c }, now);
    assert.equal(at("2026-11-24T00:00:00Z", "2026-11-30T00:00:00Z"), "open");
    assert.equal(at("2026-11-26T00:00:00Z", "2026-11-30T00:00:00Z"), "later");
    assert.equal(at("2026-11-20T00:00:00Z", "2026-11-24T00:00:00Z"), "closed");
    assert.equal(at("2026-11-24T00:00:00Z", "2026-11-30T00:00:00Z", "draft"), "draft");
    assert.equal(at("2026-11-20T00:00:00Z", "2026-11-24T00:00:00Z", "cancelled"), "cancelled", "cancelled wins over closed");
    assert.deepEqual(BATCH_FILTERS.map((f) => f.key), ["all", "open", "later", "draft", "closed", "cancelled"]);
  });

  test("search reads role and test in any case; sort by created, opening or closing", () => {
    const rows = [
      { state: "open" as const, role: "Backend engineer", title: "Backend design practical", createdAt: "2026-11-02", opensAt: "2026-11-10", closesAt: "2026-11-30" },
      { state: "draft" as const, role: "Data analyst", title: "SQL practical", createdAt: "2026-11-03", opensAt: "2026-11-05", closesAt: "2026-11-20" },
    ];
    assert.deepEqual(pickBatches(rows, "all", "", "newest").map((r) => r.role), ["Data analyst", "Backend engineer"]);
    assert.deepEqual(pickBatches(rows, "all", "", "opens").map((r) => r.role), ["Data analyst", "Backend engineer"]);
    assert.deepEqual(pickBatches(rows, "all", "  BACKEND ", "newest").map((r) => r.role), ["Backend engineer"]);
    assert.deepEqual(pickBatches(rows, "all", "sql", "newest").map((r) => r.role), ["Data analyst"], "the test's name counts too");
    assert.deepEqual(pickBatches(rows, "open", "", "newest").map((r) => r.role), ["Backend engineer"]);
  });
});

describe("the candidate table's filters", () => {
  test("a person can be under several filters; a cancelled one only under Cancelled", () => {
    assert.deepEqual(candidateTags({ active: true, delivery: "failed", link: "open" }), ["all", "open", "failed"]);
    assert.deepEqual(candidateTags({ active: true, delivery: "pending", link: "missed" }), ["all", "passed", "unsent"]);
    assert.deepEqual(candidateTags({ active: true, delivery: "sent", link: "not_open" }), ["all", "later", "sent"]);
    assert.deepEqual(candidateTags({ active: true, delivery: "skipped", link: "open" }), ["all", "open", "failed"], "not sent by the mail service counts as failed to send");
    assert.deepEqual(candidateTags({ active: false, delivery: "sent", link: "cancelled" }), ["all", "cancelled"]);
    assert.deepEqual(candidateTags({ active: false, delivery: "sent", link: "batch_cancelled" }), ["all", "cancelled"]);
  });

  test("counts and search", () => {
    const rows = [
      { name: "Asha Rao", email: "asha@example.com", tags: candidateTags({ active: true, delivery: "sent", link: "open" }) },
      { name: "Ravi Menon", email: "ravi@example.com", tags: candidateTags({ active: true, delivery: "failed", link: "open" }) },
      { name: "Sara Thomas", email: "sara@example.com", tags: candidateTags({ active: false, delivery: "sent", link: "cancelled" }) },
    ];
    const counts = countBy(rows, CANDIDATE_FILTERS.map((f) => f.key));
    assert.deepEqual([counts.all, counts.open, counts.sent, counts.failed, counts.cancelled, counts.passed], [3, 2, 1, 1, 1, 0]);
    assert.deepEqual(pickCandidates(rows, "all", "RAVI").map((r) => r.name), ["Ravi Menon"]);
    assert.deepEqual(pickCandidates(rows, "all", "example.com").length, 3, "email counts");
    assert.deepEqual(pickCandidates(rows, "open", "sara"), []);
  });
});

describe("the hiring screens show only what exists", () => {
  test("the candidate table's actions are the ones the server already has", () => {
    const table = read("src/components/company/CandidateTable.tsx");
    assert.match(table, /<CandidateActions/);
    assert.doesNotMatch(table, /<button[^>]*>\s*(Shortlist|Reject|Review|Reset)/i, "no review or decision controls before T08");
    const controls = read("src/components/company/BatchControls.tsx");
    for (const fn of ["retryDelivery", "remindCandidates", "changeCandidate", "cancelInvitation", "cancelHiringBatch", "sendHiringBatch"]) assert.match(controls, new RegExp(`${fn}\\(`), fn);
  });

  test("the batch page's tabs are the four that have content; a draft has no Emails tab", () => {
    const page = read("src/app/org/[slug]/(workspace)/hiring/[batch]/page.tsx");
    assert.match(page, /draft \? \["overview", "candidates", "invitation"\] : \["candidates", "overview", "invitation", "emails"\]/);
    assert.match(page, /typeof asked === "string" && \(tabs as string\[\]\)\.includes\(asked\)/, "an unknown tab falls back to the first");
    assert.doesNotMatch(page, /Analysis|Questions|Settings/);
  });
});
