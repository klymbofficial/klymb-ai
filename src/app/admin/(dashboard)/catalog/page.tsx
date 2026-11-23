import { CatalogAdmin, type AdminCatalogItem } from "@/components/admin/CatalogAdmin";
import { EmptyState } from "@/components/admin/EmptyState";
import { PageTitle } from "@/components/admin/PageTitle";
import { requireAdmin } from "@/lib/admin/auth";
import { loadAdminCatalog } from "@/lib/company/catalog-data";
import { db } from "@/lib/db/client";

export default async function AdminCatalogPage() {
  await requireAdmin();
  const sql = db();
  const data = sql ? await loadAdminCatalog(sql) : null;

  const items: AdminCatalogItem[] = data
    ? [...data.all.values()].map((e) => ({
        slug: e.item.slug,
        kind: e.item.kind,
        title: e.item.title,
        summary: e.item.summary,
        status: e.status,
        skills: e.skills,
        purposes: e.purposes,
        steps: e.item.kind === "program" ? e.item.steps : [],
        draftWording: e.item.kind === "assessment",
      }))
    : [];

  return (
    <>
      <PageTitle
        eyebrow="B2B"
        title="Business catalog"
        intro="A company sees an item only once it is published and given to them. Changes are logged in Admin activity."
      />
      {data ? (
        <CatalogAdmin
          items={items}
          companies={data.companies}
          grants={Object.fromEntries([...data.grants].map(([id, slugs]) => [id, [...slugs]]))}
        />
      ) : (
        <EmptyState title="Catalog unavailable" body="The database isn't reachable from here right now." />
      )}
    </>
  );
}
