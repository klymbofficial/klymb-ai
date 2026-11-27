import Link from "next/link";
import { PageTitle } from "@/components/admin/PageTitle";
import { QuestionForm } from "@/components/library/QuestionForm";
import { saveKlymbLibraryQuestion } from "@/app/admin/library-actions";
import { requireAdmin } from "@/lib/admin/auth";

/** A new question for Klymb's library; starts as a draft unless published here. */
export default async function NewKlymbQuestionPage() {
  await requireAdmin();
  return (
    <>
      <Link href="/admin/catalog/questions" className="mb-4 inline-block text-sm font-bold underline underline-offset-4">← Klymb Library</Link>
      <PageTitle eyebrow="Klymb Library" title="New question" />
      <QuestionForm initial={null} save={saveKlymbLibraryQuestion.bind(null, null, 0)} submitLabel="Save question" withStatus="draft" />
    </>
  );
}
