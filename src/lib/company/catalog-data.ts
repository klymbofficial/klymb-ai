import "server-only";
import { codeItem, type CatalogPurpose } from "@/data/business-catalog";
import type { Db } from "@/lib/db/client";
import { ownTests } from "@/lib/company/company-test-data";
import { readCatalog, visibleCatalog, type CatalogEntry, type CatalogRow, type CatalogStatus, type ProgramInput } from "@/lib/company/catalog";

/**
 * Business catalog queries (course.catalog_items and
 * course.company_catalog_grants, 0049). A company's view always comes from
 * the signed-in member's company, never from a form. A missing table (a
 * preview against an unmigrated database) reads as "nothing published and
 * nothing granted", so a company sees an empty catalog, never a draft.
 */

/** Postgres: no such table. */
const UNDEFINED_TABLE = "42P01";

const fail = (what: string, error: { code?: string; message: string }) => {
  console.error(`business catalog ${what} failed:`, error.code, error.message);
  return null;
};

/** Every item with its saved state. Null on a database error. */
export async function loadCatalog(sql: Db): Promise<Map<string, CatalogEntry> | null> {
  const { data, error } = await sql.rows<CatalogRow>`
    select slug, kind, status, skills, purposes, title, summary, steps from course.catalog_items
  `;
  if (error && error.code !== UNDEFINED_TABLE) return fail("read", error);
  return readCatalog(data ?? []);
}

/** The slugs granted to one company. Null on a database error. */
export async function grantedSlugs(sql: Db, companyId: string): Promise<Set<string> | null> {
  const { data, error } = await sql.rows<{ item_slug: string }>`
    select item_slug from course.company_catalog_grants where company_id = ${companyId}::uuid
  `;
  if (error && error.code !== UNDEFINED_TABLE) return fail("grants read", error);
  return new Set((data ?? []).map((r) => r.item_slug));
}

/** What one company may see: Klymb's items granted to it, then the tests it wrote itself (marked `own`). Null on a database error. */
export async function companyCatalog(sql: Db, companyId: string): Promise<CatalogEntry[] | null> {
  const [all, granted, own] = await Promise.all([loadCatalog(sql), grantedSlugs(sql, companyId), ownTests(sql, companyId)]);
  if (!all || !granted || !own) return null;
  return [...visibleCatalog(all, granted), ...own];
}

export interface AdminCatalog {
  all: Map<string, CatalogEntry>;
  companies: { id: string; slug: string; name: string }[];
  /** company id → granted slugs */
  grants: Map<string, Set<string>>;
}

/** Everything /admin/catalog shows. Null on a database error. */
export async function loadAdminCatalog(sql: Db): Promise<AdminCatalog | null> {
  const [all, companies, grants] = await Promise.all([
    loadCatalog(sql),
    sql.rows<{ id: string; slug: string; name: string }>`select id, slug, name from course.companies order by name`,
    sql.rows<{ company_id: string; item_slug: string }>`select company_id, item_slug from course.company_catalog_grants`,
  ]);
  if (!all || companies.error) return companies.error ? fail("companies read", companies.error) : null;
  if (grants.error && grants.error.code !== UNDEFINED_TABLE) return fail("grants read", grants.error);
  const byCompany = new Map<string, Set<string>>();
  for (const g of grants.data ?? []) {
    if (!byCompany.has(g.company_id)) byCompany.set(g.company_id, new Set());
    byCompany.get(g.company_id)!.add(g.item_slug);
  }
  return { all, companies: companies.data ?? [], grants: byCompany };
}

/**
 * Saves a course's or assessment's state, creating its row the first time.
 * A program's row already exists, so it is only updated. True when saved,
 * false when there was nothing to save, null on a database error.
 */
export async function saveItemSettings(
  sql: Db,
  item: { slug: string; kind: "course" | "assessment" | "program"; status: CatalogStatus; skills: string[]; purposes: CatalogPurpose[] },
  by: string,
): Promise<boolean | null> {
  const { data, error } =
    item.kind === "program"
      ? await sql.run`
          update course.catalog_items
             set status = ${item.status}, skills = ${item.skills}::text[], purposes = ${item.purposes}::text[], updated_at = now(), updated_by = ${by}
           where slug = ${item.slug} and kind = 'program'
        `
      : await sql.run`
          insert into course.catalog_items (slug, kind, status, skills, purposes, updated_by)
          values (${item.slug}, ${item.kind}, ${item.status}, ${item.skills}::text[], ${item.purposes}::text[], ${by})
          on conflict (slug) do update
             set status = excluded.status, skills = excluded.skills, purposes = excluded.purposes, updated_at = now(), updated_by = excluded.updated_by
           where course.catalog_items.kind = excluded.kind
        `;
  if (error) return fail("save", error);
  return (data ?? 0) > 0;
}

/**
 * Creates a program as a draft, or changes an existing one's words and steps
 * (its status, tags and purposes are kept). True when saved, false when the
 * URL name belongs to something that isn't a program, null on a database error.
 */
export async function saveProgram(sql: Db, p: ProgramInput, by: string): Promise<boolean | null> {
  const { data, error } = await sql.run`
    insert into course.catalog_items (slug, kind, status, title, summary, steps, updated_by)
    values (${p.slug}, 'program', 'draft', ${p.title}, ${p.summary}, ${p.steps}::text[], ${by})
    on conflict (slug) do update
       set title = excluded.title, summary = excluded.summary, steps = excluded.steps, updated_at = now(), updated_by = excluded.updated_by
     where course.catalog_items.kind = 'program'
  `;
  if (error) return fail("program save", error);
  return (data ?? 0) > 0;
}

/**
 * Grants an item to a company, or takes it back. A Klymb item nobody has
 * saved yet gets its draft row (with its suggested tags) in the same
 * statement, so it can be granted before it is published. True when
 * something changed, false when nothing did, null on a database error.
 */
export async function setGrant(sql: Db, companyId: string, slug: string, granted: boolean, by: string): Promise<boolean | null> {
  if (!granted) {
    const { data, error } = await sql.run`
      delete from course.company_catalog_grants where company_id = ${companyId}::uuid and item_slug = ${slug}
    `;
    return error ? fail("revoke", error) : (data ?? 0) > 0;
  }
  const code = codeItem(slug);
  const { data, error } = code
    ? await sql.run`
        with item as (
          insert into course.catalog_items (slug, kind, skills, purposes, updated_by)
          values (${code.slug}, ${code.kind}, ${[...code.suggestedSkills]}::text[], ${[...code.suggestedPurposes]}::text[], ${by})
          on conflict (slug) do nothing
        )
        insert into course.company_catalog_grants (company_id, item_slug, granted_by)
        values (${companyId}::uuid, ${slug}, ${by})
        on conflict (company_id, item_slug) do nothing
      `
    : await sql.run`
        insert into course.company_catalog_grants (company_id, item_slug, granted_by)
        select ${companyId}::uuid, slug, ${by} from course.catalog_items where slug = ${slug} and kind = 'program'
        on conflict (company_id, item_slug) do nothing
      `;
  if (error) return fail("grant", error);
  return (data ?? 0) > 0;
}
