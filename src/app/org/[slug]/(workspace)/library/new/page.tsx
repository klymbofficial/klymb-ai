import type { Metadata } from "next";
import { OrgPageHead } from "@/components/company/HiringParts";
import { RoleOnly } from "@/components/company/OrgPanels";
import { QuestionForm } from "@/components/library/QuestionForm";
import { requireCompany } from "@/lib/company/auth";
import { canWriteQuestions } from "@/lib/company/library-rules";
import { saveQuestion } from "../actions";

export const metadata: Metadata = { title: "Create a question", robots: { index: false, follow: false } };

/** A new question for My Library: multiple choice, written, or written with files. */
export default async function NewQuestionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const member = await requireCompany(slug);
  const base = `/org/${member.companySlug}/library`;
  if (!canWriteQuestions(member)) return <RoleOnly role="admins and recruiters" home={base} />;
  return (
    <>
      <OrgPageHead crumbs={[{ href: `${base}?tab=mine`, label: "My Library" }, { label: "Create a question" }]} title="Create a question" />
      <QuestionForm initial={null} save={saveQuestion.bind(null, member.companySlug, null, 0)} submitLabel="Save to My Library" />
    </>
  );
}
