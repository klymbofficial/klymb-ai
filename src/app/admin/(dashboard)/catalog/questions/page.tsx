import Link from "next/link";
import { EmptyState } from "@/components/admin/EmptyState";
import { PageTitle } from "@/components/admin/PageTitle";
import { requireAdmin } from "@/lib/admin/auth";
import { adminLibrary } from "@/lib/company/library-data";
import { DIFFICULTY_LABEL, TYPE_LABEL } from "@/lib/company/library-rules";
import { db } from "@/lib/db/client";

const STATUS = { draft: "Draft", published: "Published", retired: "Retired" } as const;

/** Klymb's question library: every question in any status. Published ones reach every company's Library. */
export default async function AdminQuestionsPage() {
  await requireAdmin();
  const sql = db();
  const list = sql ? await adminLibrary(sql) : null;
  return (
    <>
      <Link href="/admin/catalog" className="mb-4 inline-block text-sm font-bold underline underline-offset-4">← Business catalog</Link>
      <PageTitle
        eyebrow="B2B"
        title="Klymb Library"
        intro="Questions every company sees in its Library once published. Drafts and retired questions reach nobody."
        actions={<Link href="/admin/catalog/questions/new" className="border-2 border-ink px-4 py-2 text-xs font-bold uppercase tracking-wider hover:bg-ink hover:text-paper">New question</Link>}
      />
      {!list ? (
        <EmptyState title="Library unavailable" body="The database isn't reachable from here right now." />
      ) : list.length === 0 ? (
        <EmptyState title="No questions yet" body="Write the first one with New question." />
      ) : (
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line/40 text-xs uppercase tracking-wider text-muted">
            <tr><th className="py-2 pr-4">Question</th><th className="py-2 pr-4">Type</th><th className="py-2 pr-4">Difficulty</th><th className="py-2 pr-4">Points</th><th className="py-2">Status</th></tr>
          </thead>
          <tbody>
            {list.map((q) => (
              <tr key={q.id} className="border-b border-line/20">
                <td className="py-2 pr-4"><Link href={`/admin/catalog/questions/${q.id}`} className="font-bold underline-offset-4 hover:underline">{q.title}</Link></td>
                <td className="py-2 pr-4">{TYPE_LABEL[q.type]}</td>
                <td className="py-2 pr-4">{DIFFICULTY_LABEL[q.difficulty]}</td>
                <td className="py-2 pr-4">{q.points}</td>
                <td className="py-2">{STATUS[q.status]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
