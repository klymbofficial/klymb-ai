import Link from "next/link";
import { EmptyState } from "@/components/admin/EmptyState";
import { PageTitle } from "@/components/admin/PageTitle";
import { RoleEditor } from "@/components/admin/RoleEditor";
import { requireAdmin } from "@/lib/admin/auth";
import { adminLibrary } from "@/lib/company/library-data";
import { allRoles } from "@/lib/company/roles-data";
import { db } from "@/lib/db/client";

/**
 * Job roles for automatic tests (P0.4, 0068): the skills each role's
 * questions come from, matched against the published Klymb Library's tags.
 * The seed (npm run db:seed-bank) keeps the repository's roles in step.
 */
export default async function AdminRolesPage() {
  await requireAdmin();
  const sql = db();
  const [roles, lib] = sql ? await Promise.all([allRoles(sql), adminLibrary(sql)]) : [null, null];
  const tagCounts: Record<string, number> = {};
  for (const q of lib ?? []) {
    if (q.type !== "mcq" || q.status !== "published") continue;
    for (const t of q.tags) tagCounts[t.toLowerCase()] = (tagCounts[t.toLowerCase()] ?? 0) + 1;
  }
  return (
    <>
      <Link href="/admin/catalog" className="mb-4 inline-block text-sm font-bold underline underline-offset-4">← Business catalog</Link>
      <PageTitle eyebrow="B2B" title="Job roles" intro="Companies pick one of these when they create a test automatically. Each role's skills are Library tags; a role needs at least 20 matching questions to be useful." />
      {!roles ? (
        <EmptyState title="Roles unavailable" body="The database isn't reachable from here right now." />
      ) : (
        <div className="flex flex-col gap-4">
          {roles.map((r) => <RoleEditor key={r.slug} role={r} revision={r.revision} tagCounts={tagCounts} />)}
          <h2 className="mt-6 text-sm font-bold uppercase tracking-wider">Add a role</h2>
          <RoleEditor role={{ slug: "", label: "", summary: "", skills: [], status: "hidden", sort: 100 }} revision={0} tagCounts={tagCounts} />
        </div>
      )}
    </>
  );
}
