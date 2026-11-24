import type { Metadata } from "next";
import Link from "next/link";
import { KindLine, MetaLine, SkillChips } from "@/components/company/CatalogParts";
import { EmptyPanel, LoadError, OrgPageTitle, RoleOnly } from "@/components/company/OrgPanels";
import { CATALOG_KINDS, KIND_LABEL, PURPOSE_LABEL, type CatalogPurpose } from "@/data/business-catalog";
import { requireCompany } from "@/lib/company/auth";
import { defaultPurpose, filterCatalog, readFilters, seesCatalog, skillOptions, type CatalogFilters } from "@/lib/company/catalog";
import { companyCatalog } from "@/lib/company/catalog-data";
import { db } from "@/lib/db/client";

export const metadata: Metadata = { title: "Courses", robots: { index: false, follow: false } };

const field = "border border-line/60 bg-white px-3 py-2 text-sm focus:border-ink focus:outline-none";

/** The catalog URL with these filters; a purpose of null is written as `all` so it isn't replaced by the role's default. */
function hrefFor(base: string, f: CatalogFilters) {
  const q = new URLSearchParams();
  q.set("purpose", f.purpose ?? "all");
  if (f.kind) q.set("kind", f.kind);
  if (f.skill) q.set("skill", f.skill);
  if (f.q) q.set("q", f.q);
  return `${base}?${q}`;
}

/**
 * The courses and programs Klymb has published and granted to this company
 * (moved here from Catalog in L1; tests are on Assessments, questions in the
 * Library), for the people who choose what others learn.
 * It opens on the purpose that fits the viewer's role (hiring for a recruiter,
 * upskilling for a lead) and narrows by skill, kind and words. Drafts and
 * anything not granted never reach this page (src/lib/company/catalog.ts).
 */
export default async function CatalogPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const member = await requireCompany(slug);
  const base = `/org/${member.companySlug}/learning/courses`;
  if (!seesCatalog(member)) return <RoleOnly role="people who choose courses and tests" home={`/org/${member.companySlug}`} />;

  const sql = db();
  // Courses and programs only: tests live on Assessments, questions in the Library.
  const entries = sql ? (await companyCatalog(sql, member.companyId))?.filter((e) => !e.own && e.item.kind !== "assessment") ?? null : null;
  const filters = readFilters(await searchParams, defaultPurpose(member));

  const title = (
    <>
      <Link href={`/org/${member.companySlug}/learning`} className="text-sm font-bold underline underline-offset-4 hover:text-red-deep">← Upskill</Link>
      <div className="mt-4"><OrgPageTitle title="Courses" intro="The courses and programs Klymb has added to your plan." /></div>
    </>
  );
  if (!entries) return <>{title}<LoadError what="The catalog" /></>;
  if (entries.length === 0) {
    return (
      <>
        {title}
        <EmptyPanel title="No courses yet">
          Klymb adds them as your plan includes them. To ask what&apos;s available, write to team@klymb.ai.
        </EmptyPanel>
      </>
    );
  }

  const shown = filterCatalog(entries, filters);
  const purposes: (CatalogPurpose | null)[] = [null, "workforce", "hiring"];

  return (
    <>
      {title}

      <nav aria-label="Purpose" className="mb-5 flex flex-wrap gap-1">
        {purposes.map((p) => {
          const current = filters.purpose === p;
          return (
            <Link
              key={p ?? "all"}
              href={hrefFor(base, { ...filters, purpose: p })}
              aria-current={current ? "page" : undefined}
              className={current ? "bg-ink px-3 py-2 text-sm font-bold text-paper" : "border border-line/50 px-3 py-2 text-sm font-bold hover:border-ink"}
            >
              {p ? PURPOSE_LABEL[p] : "All"}
            </Link>
          );
        })}
      </nav>

      <form method="get" action={base} className="mb-8 grid grid-cols-2 items-end gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
        <input type="hidden" name="purpose" value={filters.purpose ?? "all"} />
        <label className="col-span-2 flex flex-col gap-1 text-xs font-bold sm:col-span-1">
          Search
          <input type="search" name="q" defaultValue={filters.q ?? ""} className={field} />
        </label>
        <label className="flex flex-col gap-1 text-xs font-bold">
          Skill
          <select name="skill" defaultValue={filters.skill ?? ""} className={field}>
            <option value="">Any skill</option>
            {skillOptions(entries).map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-bold">
          Kind
          <select name="kind" defaultValue={filters.kind ?? ""} className={field}>
            <option value="">Any kind</option>
            {CATALOG_KINDS.filter((k) => k !== "assessment").map((k) => (
              <option key={k} value={k}>{KIND_LABEL[k]}</option>
            ))}
          </select>
        </label>
        <button type="submit" className="col-span-2 border-2 border-ink sm:col-span-1 px-4 py-2 text-xs font-bold uppercase tracking-wider hover:bg-ink hover:text-paper">Apply</button>
      </form>

      <p className="mb-4 text-sm text-muted" aria-live="polite">
        {shown.length} of {entries.length}
        {(filters.q || filters.skill || filters.kind) && (
          <>
            {" · "}
            <Link href={hrefFor(base, { purpose: filters.purpose, kind: null, skill: null, q: null })} className="font-bold text-ink underline underline-offset-2">
              Clear filters
            </Link>
          </>
        )}
      </p>

      {shown.length === 0 ? (
        <EmptyPanel title="Nothing matches these filters" />
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {shown.map((e) => (
            <li key={e.item.slug} className="card flex flex-col gap-3 p-5">
              <KindLine entry={e} />
              <h2 className="display text-xl">
                <Link href={`${base}/${e.item.slug}`} className="underline-offset-4 hover:underline">{e.item.title}</Link>
              </h2>
              {e.item.summary && <p className="line-clamp-2 text-sm text-muted">{e.item.summary}</p>}
              <MetaLine entry={e} />
              <SkillChips skills={e.skills} hrefFor={(s) => hrefFor(base, { ...filters, skill: s })} className="mt-auto pt-1" />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
