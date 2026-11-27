import "server-only";
import type { AssessmentRole } from "@/lib/company/auto-test";
import type { Db } from "@/lib/db/client";

/**
 * Klymb's job roles for automatic tests (P0.4, migration 0093): the skills
 * each role draws questions from. Companies read active roles; Klymb admins
 * edit them. Empty before 0068.
 */

const UNDEFINED_TABLE = "42P01";
const fail = (what: string, error: { code?: string; message: string }) => {
  console.error(`roles ${what} failed:`, error.code, error.message);
  return null;
};

type Row = { slug: string; label: string; summary: string; skills: string[]; status: "active" | "hidden"; sort: number; revision: number; updated_at: string };
export interface AdminRole extends AssessmentRole { status: "active" | "hidden"; sort: number; revision: number; updatedAt: string }

/** Active roles, in their order. Null on a database error. */
export async function activeRoles(sql: Db): Promise<AssessmentRole[] | null> {
  const { data, error } = await sql.rows<Row>`
    select slug, label, summary, skills, status, sort, revision, updated_at from course.assessment_roles where status = 'active' order by sort, label
  `;
  if (error) return error.code === UNDEFINED_TABLE ? [] : fail("list", error);
  return (data ?? []).map((r) => ({ slug: r.slug, label: r.label, summary: r.summary, skills: r.skills }));
}

/** Every role, hidden ones too, for Klymb admins. */
export async function allRoles(sql: Db): Promise<AdminRole[] | null> {
  const { data, error } = await sql.rows<Row>`
    select slug, label, summary, skills, status, sort, revision, updated_at from course.assessment_roles order by sort, label
  `;
  if (error) return error.code === UNDEFINED_TABLE ? [] : fail("admin list", error);
  return (data ?? []).map((r) => ({ slug: r.slug, label: r.label, summary: r.summary, skills: r.skills, status: r.status, sort: r.sort, revision: r.revision, updatedAt: r.updated_at }));
}

export type SaveRoleResult = { status: "saved"; revision: number } | { status: "changed" | "exists" } | null;

/** Creates a role (expected 0) or saves one still at `expected`. */
export async function saveRole(
  sql: Db,
  r: { slug: string; label: string; summary: string; skills: string[]; status: "active" | "hidden"; sort: number; expected: number; by: string },
): Promise<SaveRoleResult> {
  if (r.expected === 0) {
    const { data, error } = await sql.row<{ revision: number }>`
      insert into course.assessment_roles (slug, label, summary, skills, status, sort, updated_by)
      values (${r.slug}, ${r.label}, ${r.summary}, ${r.skills}::text[], ${r.status}, ${r.sort}::int, ${r.by})
      on conflict (slug) do nothing returning revision
    `;
    if (error) return fail("create", error);
    return data ? { status: "saved", revision: data.revision } : { status: "exists" };
  }
  const { data, error } = await sql.row<{ revision: number }>`
    update course.assessment_roles
       set label = ${r.label}, summary = ${r.summary}, skills = ${r.skills}::text[], status = ${r.status}, sort = ${r.sort}::int,
           revision = revision + 1, updated_by = ${r.by}, updated_at = now()
     where slug = ${r.slug} and revision = ${r.expected}::int
    returning revision
  `;
  if (error) return fail("save", error);
  return data ? { status: "saved", revision: data.revision } : { status: "changed" };
}
