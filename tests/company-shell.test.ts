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
  test("one plain list, no headings and no Overview (user, 26 Nov): an employee sees only their Upskill", () => {
    assert.deepEqual(shape(member(["employee"])), [[null, ["My Upskill"]]]);
  });

  test("a recruiter sees Assessments first, then Upskill, People (candidates) and the Library; no Team or Branding", () => {
    const groups = navGroupsFor(member(["recruiter"]));
    assert.equal(groups.length, 1);
    assert.equal(groups[0].label, null);
    assert.deepEqual(groups[0].items.map((i) => [i.label, i.href]), [
      ["Assessments", "/org/acme/assessments"], ["My Upskill", "/org/acme/learning"], ["People", "/org/acme/people"], ["Library", "/org/acme/library"],
    ]);
  });

  test("an admin: Assessments, Upskill, People, Team, Library; Branding is Settings in the account menu", () => {
    assert.deepEqual(shape(member(["admin"])), [[null, ["Assessments", "Upskill", "People", "Team", "Library"]]]);
  });

  test("the workspace home opens Assessments, or Upskill for those who don't see them", async () => {
    const { homeFor } = await import("../src/lib/company/nav");
    assert.equal(homeFor(member(["admin"])), "/org/acme/assessments");
    assert.equal(homeFor(member(["employee"])), "/org/acme/learning");
    assert.match(read("src/app/org/[slug]/(workspace)/page.tsx"), /redirect\(homeFor\(/);
  });

  test("roles add up, and every link stays inside this company's workspace", () => {
    const groups = navGroupsFor(member(["employee", "recruiter"]));
    for (const g of groups) for (const i of g.items) assert.ok(i.href === "/org/acme" || i.href.startsWith("/org/acme/"), i.href);
    assert.ok(groups.some((g) => g.items.some((i) => i.label === "Assessments")));
    assert.ok(!groups.some((g) => g.items.some((i) => i.label === "Batches")));
  });

  test("Catalog became the Library (L1): no Catalog link; a team lead reaches courses from Upskill", () => {
    for (const roles of [["admin"], ["team_lead"], ["recruiter"], ["company_head"], ["reviewer"]] as const) {
      assert.ok(!navGroupsFor(member([...roles])).some((g) => g.items.some((i) => i.label === "Catalog" || i.href.endsWith("/catalog"))), roles.join());
    }
    assert.ok(!navGroupsFor(member(["team_lead"])).some((g) => g.items.some((i) => i.label === "Library")), "the Library is for those who see Assessments");
    assert.match(read("src/app/org/[slug]/(workspace)/learning/page.tsx"), /learning\/courses/);
  });

  test("the overview is current only on itself; a section also on the pages under it", () => {
    assert.equal(isCurrent("/org/acme", "/org/acme", "/org/acme"), true);
    assert.equal(isCurrent("/org/acme", "/org/acme/hiring", "/org/acme"), false);
    assert.equal(isCurrent("/org/acme/hiring", "/org/acme/hiring/123", "/org/acme"), true);
    assert.equal(isCurrent("/org/acme/hiring", "/org/acme/hiringx", "/org/acme"), false);
  });

  test("the workspace frame is the sidebar, with the company's brand and support contact", () => {
    const layout = read("src/app/org/[slug]/(workspace)/layout.tsx");
    assert.match(layout, /groups=\{navGroupsFor\(member, \{ myAssessments \}\)\}/);
    assert.doesNotMatch(layout, /OrgHeader/);
    const sidebar = read("src/components/company/OrgSidebar.tsx");
    assert.match(sidebar, /aria-current=\{current \? "page" : undefined\}/);
    assert.match(sidebar, /aria-expanded=\{open\}/);
    assert.match(sidebar, /useOverlayFocus\(mounted && open, drawer, \(\) => setOpen\(false\)\)/, "the phone drawer closes on Escape (the shared overlay handles it, P0.2a)");
    assert.match(sidebar, /action=\{signOutOfCompany\}/);
    assert.match(sidebar, /aria-haspopup="menu"/, "the account opens a menu: Settings, Billing, Logout");
    for (const label of ["Settings", "Billing", "Logout"]) assert.match(sidebar, new RegExp(`>${label}<|${label}\\n`), label);
    assert.doesNotMatch(sidebar, /Add admin/, "adding people is on the Team page (user, 26 Nov)");
    assert.doesNotMatch(sidebar, /on Klymb\.ai/);
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
  test("the test's candidate table carries the per-person actions the server already has (U10)", () => {
    const table = read("src/components/company/TestCandidates.tsx");
    assert.match(table, /<CandidateActions/);
    const rounds = read("src/components/company/InvitationRounds.tsx");
    assert.match(rounds, /<SendDraft/);
    assert.match(rounds, /<BatchButtons/);
    const controls = read("src/components/company/BatchControls.tsx");
    for (const fn of ["retryDelivery", "remindCandidates", "changeCandidate", "cancelInvitation", "cancelHiringBatch", "sendHiringBatch"]) assert.match(controls, new RegExp(`${fn}\\(`), fn);
    assert.match(controls, /router\.refresh\(\)/, "a completed invitation action refreshes its buttons and notices");
  });

  test("no batch pages: an old batch address redirects to its test's round, looked up within the company", () => {
    const page = read("src/app/org/[slug]/(workspace)/hiring/[batch]/page.tsx");
    assert.match(page, /company_id = \$\{member\.companyId\}::uuid/);
    assert.match(page, /redirect\(`\/org\/\$\{member\.companySlug\}\/assessments\//);
  });
});
