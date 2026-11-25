import type { Metadata } from "next";
import { OrgPageHead, PANEL } from "@/components/company/HiringParts";
import { NewTestForm } from "@/components/company/NewTestForm";
import { RoleOnly } from "@/components/company/OrgPanels";
import { canWriteTests } from "@/lib/company/assessment-rules";
import { requireCompany } from "@/lib/company/auth";

export const metadata: Metadata = { title: "Create a test", robots: { index: false, follow: false } };

/** Start a company's own test (U04a): a name and a role, then the editor. */
export default async function NewTestPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const member = await requireCompany(slug);
  const company = `/org/${member.companySlug}`;
  if (!canWriteTests(member)) return <RoleOnly role="admins and recruiters" home={company} />;
  return (
    <>
      <OrgPageHead crumbs={[{ href: `${company}/assessments`, label: "Assessments" }, { label: "Create a test" }]} title="Create a test" />
      <div className={`${PANEL} p-5 sm:p-7`}>
        <p className="mb-5 max-w-xl text-sm text-muted">
          Your own test: one task with a rubric, written or with files. Only people in your company see it. Publish it and recruiters can invite people straight away.
        </p>
        <NewTestForm slug={member.companySlug} />
      </div>
    </>
  );
}
