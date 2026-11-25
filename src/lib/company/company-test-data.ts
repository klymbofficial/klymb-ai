import "server-only";
import { randomBytes } from "node:crypto";
import type { CatalogAssessment } from "@/data/business-catalog";
import { readRubric, type AssessmentContent, type Submission } from "@/lib/company/assessment-rules";
import { questionsJson } from "@/lib/company/assessment-data";
import { durationText, type AssessmentAudience } from "@/lib/company/batch-rules";
import type { CatalogEntry } from "@/lib/company/catalog";
import type { Db } from "@/lib/db/client";

/**
 * A company's own tests (U04a, migration 0061): catalog items with
 * owner_company_id set. Every query is scoped to the signed-in member's
 * company, so another company's test reads as not found. Drafts and
 * versions are the same tables Klymb's tests use; publishing also records
 * the company's approval, so a new version is usable at once.
 */

const UNDEFINED_COLUMN = "42703";
const UNDEFINED_TABLE = "42P01";
const UNIQUE = "23505";

const fail = (what: string, error: { code?: string; message: string }) => {
  console.error(`company test ${what} failed:`, error.code, error.message);
  return null;
};

/** "t-" and 10 random letters and digits: never typed, never guessable from the name. */
export function newTestSlug(): string {
  const abc = "abcdefghijklmnopqrstuvwxyz0123456789";
  return "t-" + Array.from(randomBytes(10), (b) => abc[b % abc.length]).join("");
}

type OwnRow = {
  slug: string; title: string;
  assessment_audience: AssessmentAudience | null;
  role: string | null; minutes: number | null; submission: Submission | null; rubric: unknown;
  tools_allowed: string[] | null; tools_not_allowed: string[] | null; sample_title: string | null; sample_brief: string | null;
};

/** This company's own tests as catalog entries, newest version's details first, else the draft's. Null on a database error. */
export async function ownTests(sql: Db, companyId: string): Promise<CatalogEntry[] | null> {
  const { data, error } = await sql.rows<OwnRow>`
    select i.slug, i.title, i.assessment_audience,
           coalesce(v.role, d.role) as role, coalesce(v.minutes, d.minutes) as minutes, coalesce(v.submission, d.submission) as submission,
           coalesce(v.rubric, d.rubric) as rubric, coalesce(v.tools_allowed, d.tools_allowed) as tools_allowed,
           coalesce(v.tools_not_allowed, d.tools_not_allowed) as tools_not_allowed,
           coalesce(v.sample_title, d.sample_title) as sample_title, coalesce(v.sample_brief, d.sample_brief) as sample_brief
      from course.catalog_items i
      left join course.assessment_drafts d on d.slug = i.slug
      left join lateral (
        select * from course.assessment_versions v where v.slug = i.slug order by v.version desc limit 1
      ) v on true
     where i.owner_company_id = ${companyId}::uuid and i.kind = 'assessment' and i.status <> 'retired'
     order by i.updated_at desc
  `;
  // Before 0061 there is no such column: a company simply has no tests of its own.
  if (error) return error.code === UNDEFINED_COLUMN || error.code === UNDEFINED_TABLE ? [] : fail("list", error);
  return (data ?? []).map((r) => {
    const audience: AssessmentAudience = r.assessment_audience === "internal" ? "internal" : "external";
    const item: CatalogAssessment = {
      kind: "assessment",
      slug: r.slug,
      title: r.title,
      summary: "",
      purpose: audience === "internal" ? "Internal employee assessment" : "External candidate assessment",
      audience: audience === "internal" ? "Internal employees" : r.role || "External candidates",
      level: "Intermediate",
      duration: r.minutes ? durationText(r.minutes) : "Time not set",
      outcomes: [],
      author: "Your company",
      suggestedSkills: [],
      suggestedPurposes: [audience === "internal" ? "workforce" : "hiring"],
      format: "",
      rubric: readRubric(r.rubric).map((c) => c.title),
      tools: { allowed: r.tools_allowed ?? [], notAllowed: r.tools_not_allowed ?? [] },
      sampleTask: { title: r.sample_title ?? "", brief: r.sample_brief ?? "" },
      role: r.role ?? "",
      minutes: r.minutes ?? 0,
      submission: r.submission ?? "written",
      runnable: false,
    };
    return { item, status: "published", skills: [], purposes: [audience === "internal" ? "workforce" : "hiring"], own: true };
  });
}

/** One of this company's own tests: its title. Undefined when it isn't theirs; null on a database error. */
export async function ownTest(sql: Db, companyId: string, slug: string): Promise<{ title: string } | undefined | null> {
  const { data, error } = await sql.row<{ title: string }>`
    select title from course.catalog_items
     where slug = ${slug} and owner_company_id = ${companyId}::uuid and kind = 'assessment' and status <> 'retired'
  `;
  if (error) return error.code === UNDEFINED_COLUMN ? undefined : fail("read", error);
  return data ?? undefined;
}

/**
 * Makes the test and its first draft (revision 1) in one statement. Returns
 * the new slug. With `createKey` (one Create press, P0.4), a retry or a
 * second press returns the test that key already made, with `existed`.
 */
export async function createTest(
  sql: Db,
  t: { companyId: string; title: string; role: string; audience?: AssessmentAudience; by: string; createKey?: string },
): Promise<string | null> {
  const out = await createTestKeyed(sql, t);
  return out ? out.slug : null;
}

export async function createTestKeyed(
  sql: Db,
  t: { companyId: string; title: string; role: string; audience?: AssessmentAudience; by: string; createKey?: string },
): Promise<{ slug: string; audience: AssessmentAudience; existed: boolean } | null> {
  const key = t.createKey ?? null;
  const audience = t.audience ?? "external";
  if (key) {
    const { data, error } = await sql.row<{ slug: string; assessment_audience: AssessmentAudience | null }>`
      select slug, assessment_audience from course.catalog_items where owner_company_id = ${t.companyId}::uuid and create_key = ${key}
    `;
    if (error && error.code !== UNDEFINED_COLUMN) return fail("create lookup", error);
    if (data) return { slug: data.slug, audience: data.assessment_audience === "internal" ? "internal" : "external", existed: true };
  }
  for (let tries = 0; tries < 3; tries++) {
    const slug = newTestSlug();
    const { data, error } = await sql.row<{ slug: string }>`
      with item as (
        insert into course.catalog_items (slug, kind, status, skills, purposes, title, owner_company_id, assessment_audience, updated_by, create_key)
        values (${slug}, 'assessment', 'published', '{}', ${audience === "internal" ? ["workforce"] : ["hiring"]}::text[], ${t.title}, ${t.companyId}::uuid, ${audience}, ${t.by}, ${key})
        returning slug
      )
      insert into course.assessment_drafts (slug, revision, role, minutes, submission, rubric, results, updated_by)
      select slug, 1, ${t.role}, null, 'written', '[]'::jsonb, 'none', ${t.by} from item
      returning slug
    `;
    if (error?.code === UNIQUE) {
      // The same key landed from a parallel press: return that test.
      if (key) {
        const again = await sql.row<{ slug: string; assessment_audience: AssessmentAudience | null }>`select slug, assessment_audience from course.catalog_items where owner_company_id = ${t.companyId}::uuid and create_key = ${key}`;
        if (again.data) return { slug: again.data.slug, audience: again.data.assessment_audience === "internal" ? "internal" : "external", existed: true };
      }
      continue;
    }
    if (error) return fail("create", error);
    return data ? { slug: data.slug, audience, existed: false } : null;
  }
  return null;
}

/** Saves the draft and the title when the draft is still at `expected`, and the test is this company's. */
export async function saveOwnDraft(
  sql: Db,
  d: { companyId: string; slug: string; title: string; content: AssessmentContent; expected: number; by: string },
): Promise<{ status: "saved"; revision: number } | { status: "changed" } | null> {
  const c = d.content;
  const { data, error } = await sql.row<{ revision: number }>`
    with item as (
      update course.catalog_items set title = ${d.title}, updated_by = ${d.by}, updated_at = now()
       where slug = ${d.slug} and owner_company_id = ${d.companyId}::uuid and kind = 'assessment'
         and exists (select 1 from course.assessment_drafts x where x.slug = ${d.slug} and x.revision = ${d.expected}::int)
      returning slug
    )
    update course.assessment_drafts as x
       set revision = x.revision + 1, role = ${c.role}, minutes = ${c.minutes}::int, submission = ${c.submission},
           tools_allowed = ${c.toolsAllowed}::text[], tools_not_allowed = ${c.toolsNotAllowed}::text[],
           instructions = ${c.instructions}, task_title = ${c.taskTitle}, task_brief = ${c.taskBrief},
           sample_title = ${c.sampleTitle}, sample_brief = ${c.sampleBrief}, rubric = ${JSON.stringify(c.rubric)}::jsonb,
           results = ${c.results}, questions = ${questionsJson(c)}::jsonb, updated_by = ${d.by}, updated_at = now()
      from item
     where x.slug = item.slug and x.revision = ${d.expected}::int
    returning x.revision
  `;
  if (error) return fail("save", error);
  return data ? { status: "saved", revision: data.revision } : { status: "changed" };
}

/**
 * Publishes the draft, exactly as it was at `revision`, as the next version,
 * and records this company's approval of it in the same statement.
 * "changed" when the draft moved on, another publish took the number, or
 * the test isn't this company's.
 */
export async function publishOwnDraft(
  sql: Db,
  p: { companyId: string; slug: string; revision: number; by: string },
): Promise<{ status: "published"; version: number } | { status: "changed" } | null> {
  const { data, error } = await sql.row<{ version: number }>`
    with v as (
      insert into course.assessment_versions
        (slug, version, draft_revision, title, role, minutes, submission, tools_allowed, tools_not_allowed, instructions, task_title, task_brief,
         sample_title, sample_brief, rubric, results, questions, published_by)
      select d.slug, coalesce((select max(v.version) from course.assessment_versions v where v.slug = d.slug), 0) + 1, d.revision, i.title,
             d.role, d.minutes, d.submission, d.tools_allowed, d.tools_not_allowed, d.instructions, d.task_title, d.task_brief,
             d.sample_title, d.sample_brief, d.rubric, d.results, d.questions, ${p.by}
        from course.assessment_drafts d
        join course.catalog_items i on i.slug = d.slug and i.owner_company_id = ${p.companyId}::uuid
       where d.slug = ${p.slug} and d.revision = ${p.revision}::int
      returning id, version
    ),
    ok as (
      insert into course.company_assessment_reviews (company_id, version_id, decision, note, decided_by)
      select ${p.companyId}::uuid, v.id, 'approved', null, ${p.by} from v
      returning version_id
    )
    select v.version from v join ok on ok.version_id = v.id
  `;
  if (error) return error.code === UNIQUE ? { status: "changed" } : fail("publish", error);
  return data ? { status: "published", version: data.version } : { status: "changed" };
}
