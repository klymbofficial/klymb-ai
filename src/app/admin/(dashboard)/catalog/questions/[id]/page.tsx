import Link from "next/link";
import { notFound } from "next/navigation";
import { EmptyState } from "@/components/admin/EmptyState";
import { PageTitle } from "@/components/admin/PageTitle";
import { QuestionForm } from "@/components/library/QuestionForm";
import { saveKlymbLibraryQuestion } from "@/app/admin/library-actions";
import { requireAdmin } from "@/lib/admin/auth";
import { adminQuestion } from "@/lib/company/library-data";
import { db } from "@/lib/db/client";

/** One question in Klymb's library: edit it and choose who sees it. Tests that copied it keep their copy. */
export default async function KlymbQuestionPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const sql = db();
  const q = sql ? await adminQuestion(sql, id) : null;
  const back = <Link href="/admin/catalog/questions" className="mb-4 inline-block text-sm font-bold underline underline-offset-4">← Klymb Library</Link>;
  if (q === null) return <>{back}<EmptyState title="Question unavailable" body="The database isn't reachable from here right now." /></>;
  if (!q) notFound();
  return (
    <>
      {back}
      <PageTitle eyebrow="Klymb Library" title={q.title} intro={`Revision ${q.revision}. Edits reach companies' Library at once when published; tests that already copied it keep their copy.`} />
      <QuestionForm initial={q} save={saveKlymbLibraryQuestion.bind(null, q.id, q.revision)} submitLabel="Save changes" withStatus={q.status} />
    </>
  );
}
