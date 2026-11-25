import { strict as assert } from "node:assert";
import { test } from "node:test";
import { CODE_ITEMS, codeItem } from "../src/data/business-catalog";
import type { CompanyMember, CompanyRole } from "../src/lib/company/access";
import {
  defaultPurpose,
  filterCatalog,
  parseProgram,
  parseSkills,
  publishBlocked,
  readCatalog,
  readFilters,
  seesCatalog,
  skillOptions,
  visibleCatalog,
  type CatalogRow,
} from "../src/lib/company/catalog";

const row = (slug: string, over: Partial<CatalogRow> = {}): CatalogRow => ({
  slug,
  kind: codeItem(slug)?.kind ?? "program",
  status: "published",
  skills: ["System design"],
  purposes: ["workforce"],
  title: null,
  summary: null,
  steps: null,
  ...over,
});
const program = (slug: string, steps: string[], over: Partial<CatalogRow> = {}) =>
  row(slug, { kind: "program", title: `Program ${slug}`, summary: "Steps in order", steps, ...over });
const slugs = (entries: { item: { slug: string } }[]) => entries.map((e) => e.item.slug);

const member = (roles: CompanyRole[]): CompanyMember => ({
  email: "someone@example.test",
  roles,
  teamId: null,
  leadTeamId: roles.includes("team_lead") ? "team-1" : null,
  companyId: "company-1",
  companySlug: "example",
  companyName: "Example",
});

test("nothing is visible until a Klymb admin publishes it", () => {
  const all = readCatalog([]);
  assert.equal(all.size, CODE_ITEMS.length);
  for (const e of all.values()) assert.equal(e.status, "draft");
  assert.deepEqual(visibleCatalog(all, new Set(CODE_ITEMS.map((i) => i.slug))), [], "granted drafts stay hidden");
});

test("a company sees a published item only once it is granted", () => {
  const all = readCatalog([row("system-design")]);
  assert.deepEqual(slugs(visibleCatalog(all, new Set())), []);
  assert.deepEqual(slugs(visibleCatalog(all, new Set(["system-design"]))), ["system-design"]);
});

test("retired and draft items stay out whoever is granted them", () => {
  const all = readCatalog([row("system-design", { status: "retired" }), row("system-design-baseline", { status: "draft" })]);
  assert.deepEqual(slugs(visibleCatalog(all, new Set(["system-design", "system-design-baseline"]))), []);
});

test("the same published course serves several companies without a copy", () => {
  const all = readCatalog([row("system-design")]);
  const a = visibleCatalog(all, new Set(["system-design"]));
  const b = visibleCatalog(all, new Set(["system-design"]));
  assert.equal(a[0].item, b[0].item, "both read the one course");
});

test("a granted program shows its published steps, in order, and hides its drafts", () => {
  const all = readCatalog([
    row("system-design"),
    row("system-design-baseline"),
    row("backend-design-practical", { status: "draft" }),
    program("engineering-upskilling", ["system-design-baseline", "backend-design-practical", "system-design"]),
  ]);
  const seen = visibleCatalog(all, new Set(["engineering-upskilling"]));
  assert.deepEqual(slugs(seen), ["engineering-upskilling", "system-design", "system-design-baseline"]);
  const p = seen[0].item;
  assert.equal(p.kind, "program");
  if (p.kind === "program") assert.deepEqual(p.steps, ["system-design-baseline", "system-design"]);
});

test("an unpublished program opens nothing, even when granted", () => {
  const all = readCatalog([row("system-design"), program("engineering-upskilling", ["system-design"], { status: "draft" })]);
  assert.deepEqual(slugs(visibleCatalog(all, new Set(["engineering-upskilling"]))), []);
});

test("rows that don't match the code are ignored, and a program keeps only real course and assessment steps", () => {
  const all = readCatalog([
    row("system-design", { kind: "assessment" }),
    row("no-longer-in-code", { kind: "course" }),
    program("p-one", ["system-design", "p-two", "made-up", "system-design"]),
    program("p-two", ["system-design"]),
  ]);
  assert.equal(all.get("system-design")?.status, "draft", "a kind mismatch is treated as unsaved");
  assert.equal(all.has("no-longer-in-code"), false);
  const p = all.get("p-one")?.item;
  assert.ok(p && p.kind === "program");
  assert.deepEqual(p.steps, ["system-design"]);
});

test("a lead finds the baseline by skill, and its follow-up course is in the catalog", () => {
  const all = readCatalog([
    row("system-design", { skills: ["System design", "Scalability"], purposes: ["workforce", "hiring"] }),
    row("system-design-baseline", { skills: ["System design"], purposes: ["workforce"] }),
    row("backend-design-practical", { skills: ["API design"], purposes: ["hiring"] }),
  ]);
  const seen = visibleCatalog(all, new Set(["system-design", "system-design-baseline", "backend-design-practical"]));
  const lead = member(["team_lead"]);
  const found = filterCatalog(seen, readFilters({ skill: "system DESIGN", kind: "assessment" }, defaultPurpose(lead)));
  assert.deepEqual(slugs(found), ["system-design-baseline"]);
  const baseline = found[0].item;
  assert.ok(baseline.kind === "assessment" && baseline.followUp);
  assert.ok(slugs(seen).includes(baseline.followUp), "the follow-up course is visible too");
});

test("a recruiter lands on hiring: the test and the prep course, not the baseline", () => {
  const all = readCatalog([
    row("system-design", { purposes: ["workforce", "hiring"] }),
    row("system-design-baseline", { purposes: ["workforce"] }),
    row("backend-design-practical", { purposes: ["hiring"] }),
  ]);
  const seen = visibleCatalog(all, new Set(["system-design", "system-design-baseline", "backend-design-practical"]));
  const recruiter = member(["recruiter"]);
  const found = filterCatalog(seen, readFilters({}, defaultPurpose(recruiter)));
  assert.deepEqual(slugs(found), ["system-design", "backend-design-practical"]);
  const test = codeItem("backend-design-practical");
  assert.ok(test?.kind === "assessment" && test.prep === "system-design");
  assert.deepEqual(slugs(filterCatalog(seen, readFilters({ purpose: "all" }, "hiring"))).length, 3, "purpose=all shows everything");
});

test("search matches every word, and skills are listed once each", () => {
  const all = readCatalog([row("system-design", { skills: ["System design", "Scalability"] }), row("system-design-baseline", { skills: ["system design"] })]);
  const seen = visibleCatalog(all, new Set(["system-design", "system-design-baseline"]));
  assert.deepEqual(slugs(filterCatalog(seen, readFilters({ q: "baseline design" }, null))), ["system-design-baseline"]);
  assert.deepEqual(skillOptions(seen), ["Scalability", "System design"]);
});

test("only people who choose content see the catalog; the default purpose follows the role", () => {
  assert.equal(seesCatalog(member(["employee"])), false);
  for (const r of ["admin", "company_head", "team_lead", "recruiter", "reviewer"] as const) assert.equal(seesCatalog(member([r])), true, r);
  assert.equal(defaultPurpose(member(["admin"])), null);
  assert.equal(defaultPurpose(member(["team_lead", "recruiter"])), "workforce");
  assert.equal(defaultPurpose(member(["recruiter"])), "hiring");
});

test("unknown filters are ignored", () => {
  assert.deepEqual(readFilters({ purpose: "sales", kind: "video", skill: "  ", q: ["x", "y"] }, "workforce"), {
    purpose: "workforce", kind: null, skill: null, q: "x",
  });
});

test("skills are trimmed, kept once each, and limited", () => {
  assert.deepEqual(parseSkills(" System  design, system design\nScalability,, "), { ok: true, value: ["System design", "Scalability"] });
  assert.equal(parseSkills(Array.from({ length: 13 }, (_, i) => `s${i}`).join(",")).ok, false);
  assert.equal(parseSkills("x".repeat(41)).ok, false);
});

test("a program names only real courses and assessments, once each, and never takes a Klymb item's URL name", () => {
  const ok = parseProgram({ slug: "Eng-Upskilling ", title: " Engineering  upskilling ", summary: "", steps: "system-design-baseline\nsystem-design" });
  assert.deepEqual(ok, { ok: true, value: { slug: "eng-upskilling", title: "Engineering upskilling", summary: null, steps: ["system-design-baseline", "system-design"] } });
  assert.equal(parseProgram({ slug: "system-design", title: "x", summary: "", steps: "system-design" }).ok, false);
  assert.equal(parseProgram({ slug: "eng", title: "x", summary: "", steps: "system-design\nsystem-design" }).ok, false);
  assert.equal(parseProgram({ slug: "eng", title: "x", summary: "", steps: "made-up" }).ok, false);
  assert.equal(parseProgram({ slug: "eng", title: "x", summary: "", steps: "" }).ok, false);
  assert.equal(parseProgram({ slug: "e", title: "x", summary: "", steps: "system-design" }).ok, false);
});

test("a program can be published only once all its steps are", () => {
  const all = readCatalog([row("system-design"), row("system-design-baseline", { status: "draft" }), program("p", ["system-design-baseline", "system-design"])]);
  assert.match(publishBlocked(all.get("p")!, all) ?? "", /system-design-baseline/);
  assert.equal(publishBlocked(all.get("system-design")!, all), null);
  const ready = readCatalog([row("system-design"), program("p", ["system-design"])]);
  assert.equal(publishBlocked(ready.get("p")!, ready), null);
});

test("Klymb items are well formed and hold no answer keys or scoring rules", () => {
  const keys = new Set<string>();
  const walk = (v: unknown) => {
    if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) { keys.add(k); walk(x); }
  };
  walk(CODE_ITEMS);
  for (const k of keys) assert.doesNotMatch(k, /answer|key|solution|scor|weight|correct/i, k);
  assert.equal(new Set(CODE_ITEMS.map((i) => i.slug)).size, CODE_ITEMS.length);
  for (const i of CODE_ITEMS) {
    assert.match(i.slug, /^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$/);
    if (i.kind === "assessment") {
      for (const ref of [i.followUp, i.prep]) if (ref) assert.equal(codeItem(ref)?.kind, "course", `${i.slug} → ${ref}`);
      assert.equal(i.runnable, false);
    }
  }
});
