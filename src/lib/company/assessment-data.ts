import "server-only";
import type { CatalogAssessment } from "@/data/business-catalog";
import type { Db } from "@/lib/db/client";
import {
  readQuestions,
  readRubric,
  standingOf,
  type AssessmentContent,
  type Decision,
  type Draft,
  type ResultVisibility,
  type ReviewRow,
  type Standing,
  type Submission,
  type Version,
} from "@/lib/company/assessment-rules";

/**
 * Practical assessment queries (migration 0051): Klymb's draft, the frozen
 * versions publishing makes, and each company's decision on them. Every
 * write is one statement. A missing table (a preview against an unmigrated
 * database) reads as "no draft, no versions, no decisions", so a company
 * never sees a test that isn't there.
 */

/** Postgres: no such table; a unique key taken; a value failing a check. */
const UNDEFINED_TABLE = "42P01";
const UNIQUE = "23505";

const fail = (what: string, error: { code?: string; message: string }) => {
  console.error(`assessment ${what} failed:`, error.code, error.message);
  return null;
};

interface ContentRow {
  role: string;
  minutes: number | null;
  submission: Submission;
  tools_allowed: string[] | null;
  tools_not_allowed: string[] | null;
  instructions: string;
  task_title: string;
  task_brief: string;
  sample_title: string;
  sample_brief: string;
  rubric: unknown;
  results: ResultVisibility;
  /** Drafts only, until U04b-2 adds it to versions. */
  questions?: unknown;
}

const contentFrom = (r: ContentRow): AssessmentContent => ({
  role: r.role,
  minutes: r.minutes,
  submission: r.submission,
  toolsAllowed: r.tools_allowed ?? [],
  toolsNotAllowed: r.tools_not_allowed ?? [],
  instructions: r.instructions,
  taskTitle: r.task_title,
  taskBrief: r.task_brief,
  sampleTitle: r.sample_title,
  sampleBrief: r.sample_brief,
  rubric: readRubric(r.rubric),
  results: r.results,
  questions: readQuestions(r.questions),
});

const iso = (d: string | Date) => new Date(d).toISOString();

/** The questions column as sent: null for a one-task test. */
export const questionsJson = (c: AssessmentContent) => (c.questions?.length ? JSON.stringify(c.questions) : null);

/** The saved draft, undefined when nobody has saved one, null on a database error. */
export async function loadDraft(sql: Db, slug: string): Promise<Draft | undefined | null> {
  const { data, error } = await sql.rows<ContentRow & { revision: number; updated_by: string; updated_at: string }>`
    select revision, role, minutes, submission, tools_allowed, tools_not_allowed, instructions, task_title, task_brief,
           sample_title, sample_brief, rubric, results, questions, updated_by, updated_at
      from course.assessment_drafts where slug = ${slug}
  `;
  if (error) return error.code === UNDEFINED_TABLE ? undefined : fail("draft read", error);
  const row = data?.[0];
  if (!row) return undefined;
  return { ...contentFrom(row), revision: row.revision, updatedBy: row.updated_by, updatedAt: iso(row.updated_at) };
}

/**
 * Saves the draft when it is still at the revision the editor opened
 * (0: nobody had saved one). The item's catalog row is made in the same
 * statement if nobody has touched it yet, as a grant does.
 */
export async function saveDraft(
  sql: Db,
  code: CatalogAssessment,
  c: AssessmentContent,
  expected: number,
  by: string,
): Promise<{ status: "saved"; revision: number } | { status: "changed" } | null> {
  const { data, error } = await sql.rows<{ revision: number }>`
    with item as (
      insert into course.catalog_items (slug, kind, skills, purposes, updated_by)
      values (${code.slug}, 'assessment', ${[...code.suggestedSkills]}::text[], ${[...code.suggestedPurposes]}::text[], ${by})
      on conflict (slug) do nothing
    )
    insert into course.assessment_drafts as d
      (slug, revision, role, minutes, submission, tools_allowed, tools_not_allowed, instructions, task_title, task_brief,
       sample_title, sample_brief, rubric, results, questions, updated_by)
    select ${code.slug}, 1, ${c.role}, ${c.minutes}::int, ${c.submission}, ${c.toolsAllowed}::text[], ${c.toolsNotAllowed}::text[],
           ${c.instructions}, ${c.taskTitle}, ${c.taskBrief}, ${c.sampleTitle}, ${c.sampleBrief}, ${JSON.stringify(c.rubric)}::jsonb,
           ${c.results}, ${questionsJson(c)}::jsonb, ${by}
     where ${expected}::int = 0
        or exists (select 1 from course.assessment_drafts where slug = ${code.slug})
    on conflict (slug) do update
       set revision = d.revision + 1, role = excluded.role, minutes = excluded.minutes, submission = excluded.submission,
           tools_allowed = excluded.tools_allowed, tools_not_allowed = excluded.tools_not_allowed,
           instructions = excluded.instructions, task_title = excluded.task_title, task_brief = excluded.task_brief,
           sample_title = excluded.sample_title, sample_brief = excluded.sample_brief, rubric = excluded.rubric,
           results = excluded.results, questions = excluded.questions, updated_by = excluded.updated_by, updated_at = now()
     where d.revision = ${expected}::int
    returning d.revision
  `;
  if (error) return error.code === UNIQUE ? { status: "changed" } : fail("draft save", error);
  const row = data?.[0];
  return row ? { status: "saved", revision: row.revision } : { status: "changed" };
}

/**
 * Copies the draft, at the revision the admin was looking at, into the next
 * numbered version. "changed" when the draft moved on meanwhile, another
 * publish took the number first, or this revision is already published
 * (a retried or double-clicked publish); nothing is written then.
 */
export async function publishDraft(
  sql: Db,
  slug: string,
  title: string,
  revision: number,
  by: string,
): Promise<{ status: "published"; version: number } | { status: "changed" } | null> {
  const { data, error } = await sql.rows<{ version: number }>`
    insert into course.assessment_versions
      (slug, version, draft_revision, title, role, minutes, submission, tools_allowed, tools_not_allowed, instructions, task_title, task_brief,
       sample_title, sample_brief, rubric, results, published_by)
    select d.slug, coalesce((select max(v.version) from course.assessment_versions v where v.slug = d.slug), 0) + 1, d.revision, ${title},
           d.role, d.minutes, d.submission, d.tools_allowed, d.tools_not_allowed, d.instructions, d.task_title, d.task_brief,
           d.sample_title, d.sample_brief, d.rubric, d.results, ${by}
      from course.assessment_drafts d
     where d.slug = ${slug} and d.revision = ${revision}::int
       -- A test with several questions isn't published until candidates can answer them (U04b-2).
       and d.questions is null
    returning version
  `;
  if (error) return error.code === UNIQUE ? { status: "changed" } : fail("publish", error);
  const row = data?.[0];
  return row ? { status: "published", version: row.version } : { status: "changed" };
}

/** Every version of one assessment, newest first. Null on a database error. */
export async function loadVersions(sql: Db, slug: string): Promise<Version[] | null> {
  const { data, error } = await sql.rows<ContentRow & { id: string; slug: string; version: number; title: string; minutes: number; published_by: string; published_at: string }>`
    select id, slug, version, title, role, minutes, submission, tools_allowed, tools_not_allowed, instructions, task_title, task_brief,
           sample_title, sample_brief, rubric, results, published_by, published_at
      from course.assessment_versions where slug = ${slug}
     order by version desc
  `;
  if (error) return error.code === UNDEFINED_TABLE ? [] : fail("versions read", error);
  return (data ?? []).map((r) => ({
    ...contentFrom(r),
    minutes: r.minutes,
    id: r.id,
    slug: r.slug,
    version: r.version,
    title: r.title,
    publishedBy: r.published_by,
    publishedAt: iso(r.published_at),
  }));
}

/** One company's decisions on these versions, by version id. Null on a database error. */
export async function companyReviews(sql: Db, companyId: string, versionIds: string[]): Promise<Map<string, ReviewRow> | null> {
  if (!versionIds.length) return new Map();
  const { data, error } = await sql.rows<{ version_id: string; decision: Decision; note: string | null; decided_by: string; decided_at: string }>`
    select version_id, decision, note, decided_by, decided_at
      from course.company_assessment_reviews
     where company_id = ${companyId}::uuid and version_id = any(${versionIds}::uuid[])
  `;
  if (error) return error.code === UNDEFINED_TABLE ? new Map() : fail("reviews read", error);
  return new Map((data ?? []).map((r) => [r.version_id, { versionId: r.version_id, decision: r.decision, note: r.note, decidedBy: r.decided_by, decidedAt: iso(r.decided_at) }]));
}

/** For Klymb: every company's decision on these versions. Null on a database error. */
export async function allReviews(sql: Db, versionIds: string[]): Promise<(ReviewRow & { company: string })[] | null> {
  if (!versionIds.length) return [];
  const { data, error } = await sql.rows<{ version_id: string; decision: Decision; note: string | null; decided_by: string; decided_at: string; company: string }>`
    select r.version_id, r.decision, r.note, r.decided_by, r.decided_at, c.name as company
      from course.company_assessment_reviews r
      join course.companies c on c.id = r.company_id
     where r.version_id = any(${versionIds}::uuid[])
     order by r.decided_at desc
  `;
  if (error) return error.code === UNDEFINED_TABLE ? [] : fail("reviews read", error);
  return (data ?? []).map((r) => ({ versionId: r.version_id, decision: r.decision, note: r.note, decidedBy: r.decided_by, decidedAt: iso(r.decided_at), company: r.company }));
}

/** Where one company stands on each of these assessments. Null on a database error. */
export async function companyStandings(sql: Db, companyId: string, slugs: string[]): Promise<Map<string, Standing> | null> {
  if (!slugs.length) return new Map();
  const { data, error } = await sql.rows<{ id: string; slug: string; version: number; minutes: number; decision: Decision | null; note: string | null; decided_by: string | null; decided_at: string | null }>`
    select v.id, v.slug, v.version, v.minutes, r.decision, r.note, r.decided_by, r.decided_at
      from course.assessment_versions v
      left join course.company_assessment_reviews r on r.version_id = v.id and r.company_id = ${companyId}::uuid
     where v.slug = any(${slugs}::text[])
  `;
  if (error && error.code !== UNDEFINED_TABLE) return fail("standings read", error);
  const rows = data ?? [];
  const out = new Map<string, Standing>();
  for (const slug of slugs) {
    const mine = rows.filter((r) => r.slug === slug);
    const reviews = new Map(
      mine.filter((r) => r.decision && r.decided_by && r.decided_at).map((r) => [r.id, { versionId: r.id, decision: r.decision!, note: r.note, decidedBy: r.decided_by!, decidedAt: iso(r.decided_at!) }]),
    );
    out.set(slug, standingOf(mine.map((r) => ({ version: r.version, id: r.id, minutes: r.minutes })), reviews));
  }
  return out;
}

/**
 * Records a company's decision on a version, only while it is the newest
 * version of that assessment. A changed mind replaces the earlier decision.
 * True when saved, false when a newer version has been published, null on a
 * database error.
 */
export async function setReview(
  sql: Db,
  r: { companyId: string; slug: string; versionId: string; decision: Decision; note: string | null; by: string },
): Promise<boolean | null> {
  const { data, error } = await sql.run`
    insert into course.company_assessment_reviews (company_id, version_id, decision, note, decided_by)
    select ${r.companyId}::uuid, v.id, ${r.decision}, ${r.note}, ${r.by}
      from course.assessment_versions v
     where v.id = ${r.versionId}::uuid and v.slug = ${r.slug}
       and v.version = (select max(version) from course.assessment_versions where slug = ${r.slug})
       -- A company's own test is approved by publishing it, never here.
       and not exists (select 1 from course.catalog_items i where i.slug = v.slug and i.owner_company_id is not null)
    on conflict (company_id, version_id) do update
       set decision = excluded.decision, note = excluded.note, decided_by = excluded.decided_by, decided_at = now()
  `;
  if (error) return fail("review save", error);
  return (data ?? 0) > 0;
}

/** How many versions each assessment has, for the catalog list. Empty on an error: it is only a count. */
export async function versionCounts(sql: Db): Promise<Map<string, number>> {
  const { data, error } = await sql.rows<{ slug: string; n: number }>`
    select slug, count(*)::int as n from course.assessment_versions group by slug
  `;
  if (error && error.code !== UNDEFINED_TABLE) fail("version counts read", error);
  return new Map((data ?? []).map((r) => [r.slug, r.n]));
}
