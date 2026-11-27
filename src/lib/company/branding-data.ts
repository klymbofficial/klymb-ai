import "server-only";
import { cache } from "react";
import { db, type Db } from "@/lib/db/client";
import { workspaceSlug } from "@/lib/company/access";
import { readBrand, resolveBrand, type BrandCompany, type BrandSettings, type ResolvedBrand } from "@/lib/company/branding";

/**
 * Branding queries (course.company_branding, 0048). The company always comes
 * from the signed-in admin or the public slug, never from a form. A missing
 * table (a preview against an unmigrated database) reads as "nothing
 * published", so pages fall back to the company's name and Klymb's look.
 */

/** Postgres: no such table. */
const UNDEFINED_TABLE = "42P01";

export interface BrandingState {
  company: BrandCompany;
  draft: BrandSettings;
  published: BrandSettings | null;
  draftUpdatedAt: string | null;
  publishedAt: string | null;
}

/** Everything the Branding page needs. Null on a database error or an unknown company. */
export async function loadBranding(sql: Db, companyId: string): Promise<BrandingState | null> {
  const company = await sql.row<BrandCompany>`
    select id, slug, name, brand_color, logo_url from course.companies where id = ${companyId}::uuid
  `;
  if (company.error || !company.data) return null;
  const { data, error } = await sql.row<{ draft: unknown; published: unknown; draft_updated_at: string | null; published_at: string | null }>`
    select draft, published, draft_updated_at, published_at from course.company_branding where company_id = ${companyId}::uuid
  `;
  if (error && error.code !== UNDEFINED_TABLE) return null;
  return {
    company: company.data,
    draft: readBrand(data?.draft, companyId),
    published: data?.published ? readBrand(data.published, companyId) : null,
    draftUpdatedAt: data?.draft_updated_at ?? null,
    publishedAt: data?.published_at ?? null,
  };
}

/** A company's published look, by id. Null on a database error or an unknown company. */
export async function publishedBrand(sql: Db, companyId: string): Promise<ResolvedBrand | null> {
  const state = await loadBranding(sql, companyId);
  return state ? resolveBrand(state.company, state.published) : null;
}

/** The published look of a workspace's company, once per request. Falls back to its plain name on any error. */
export const getPublishedBrand = cache(async (company: { companyId: string; companySlug: string; companyName: string }): Promise<ResolvedBrand> => {
  const sql = db();
  const brand = sql ? await publishedBrand(sql, company.companyId) : null;
  return brand ?? {
    companyId: company.companyId, slug: company.companySlug, name: company.companyName, accent: null,
    logoUrl: null, logoAlt: `${company.companyName} logo`, welcome: null, supportEmail: null, supportText: null,
  };
});

/** A company's published look, by its public slug: the branded sign-in page. Null when there is no such company. */
export async function publishedBrandBySlug(sql: Db, slug: unknown): Promise<ResolvedBrand | null> {
  const wanted = workspaceSlug(slug);
  if (!wanted) return null;
  const { data, error } = await sql.row<{ id: string }>`select id from course.companies where slug = ${wanted}`;
  if (error || !data) return null;
  return publishedBrand(sql, data.id);
}

/** Saves the draft. True when saved, null on a database error. */
export async function saveDraft(sql: Db, companyId: string, draft: BrandSettings, by: string): Promise<true | null> {
  const { error } = await sql.run`
    insert into course.company_branding (company_id, draft, draft_updated_at, draft_updated_by)
    values (${companyId}::uuid, ${JSON.stringify(draft)}::jsonb, now(), ${by})
    on conflict (company_id) do update
       set draft = excluded.draft, draft_updated_at = now(), draft_updated_by = excluded.draft_updated_by
  `;
  if (error) {
    console.error("company branding save failed:", error.code, error.message);
    return null;
  }
  return true;
}

/**
 * Publishes the saved draft as it is in the database, so what goes live is
 * exactly what was previewed after saving. 1 when published, 0 when there is
 * no draft, null on a database error.
 */
export async function publishDraft(sql: Db, companyId: string, by: string): Promise<number | null> {
  const { data, error } = await sql.run`
    update course.company_branding
       set published = draft, published_at = now(), published_by = ${by}
     where company_id = ${companyId}::uuid and draft_updated_at is not null
  `;
  if (error) {
    console.error("company branding publish failed:", error.code, error.message);
    return null;
  }
  return data ?? 0;
}

/**
 * Whether this logo key is in the company's published branding (anyone may
 * see it) or only in its draft (only its admins may). Null when it is in
 * neither, or on any error.
 */
export async function logoVisibility(sql: Db, companyId: string, key: string): Promise<"published" | "draft" | null> {
  const { data, error } = await sql.row<{ published: boolean; draft: boolean }>`
    select coalesce(published -> 'logo' ->> 'key' = ${key}, false) as published,
           coalesce(draft -> 'logo' ->> 'key' = ${key}, false) as draft
      from course.company_branding where company_id = ${companyId}::uuid
  `;
  if (error || !data) return null;
  return data.published ? "published" : data.draft ? "draft" : null;
}

/** The company whose assignment opens this course for this email, and its published look. Null when access isn't from a company. */
export async function assigningCompanyBrand(sql: Db, email: string, course: string): Promise<ResolvedBrand | null> {
  const live = await sql.row<{ company_id: string }>`
    select r.company_id
      from course.company_assignment_recipients r
      join course.company_members m on m.company_id = r.company_id and m.email = r.email
     where r.email = ${email} and r.course = ${course} and r.revoked_at is null and m.removed_at is null
     order by r.added_at desc
     limit 1
  `;
  // Before 0050 (a preview against an unmigrated database): 0030's table.
  const { data, error } = live.error?.code === UNDEFINED_TABLE
    ? await sql.row<{ company_id: string }>`
        select a.company_id
          from course.company_course_assignments a
          join course.company_members m on m.company_id = a.company_id and m.email = a.email
         where a.email = ${email} and a.course = ${course} and a.revoked_at is null and m.removed_at is null
         limit 1
      `
    : live;
  if (error || !data) return null;
  return publishedBrand(sql, data.company_id);
}
