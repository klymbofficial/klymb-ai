import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { OrgPageHead } from "@/components/company/HiringParts";
import { LoadError, RoleOnly } from "@/components/company/OrgPanels";
import { QuestionForm } from "@/components/library/QuestionForm";
import { requireCompany } from "@/lib/company/auth";
import { libraryQuestion } from "@/lib/company/library-data";
import { canWriteQuestions } from "@/lib/company/library-rules";
import { db } from "@/lib/db/client";
import { saveQuestion } from "../../actions";

export const metadata: Metadata = { title: "Edit question", robots: { index: false, follow: false } };

/** Edits one of this company's questions. Klymb's questions and other companies' read as not found. */
export default async function EditQuestionPage({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  const member = await requireCompany(slug);
  const base = `/org/${member.companySlug}/library`;
  if (!canWriteQuestions(member)) return <RoleOnly role="admins and recruiters" home={base} />;
  const sql = db();
  const q = sql ? await libraryQuestion(sql, member.companyId, id) : null;
  if (q === null) return <LoadError what="This question" />;
  if (!q || !q.own) notFound();
  return (
    <>
      <OrgPageHead crumbs={[{ href: `${base}?tab=mine`, label: "My Library" }, { href: `${base}?tab=mine&q=${q.id}`, label: q.title }, { label: "Edit" }]} title="Edit question" />
      <QuestionForm initial={q} save={saveQuestion.bind(null, member.companySlug, q.id, q.revision)} submitLabel="Save changes" />
    </>
  );
}
