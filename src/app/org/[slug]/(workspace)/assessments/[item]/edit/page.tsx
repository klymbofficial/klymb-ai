import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { publishOwnTest, saveOwnTest } from "@/app/org/[slug]/(workspace)/assessments/test-actions";
import { AssessmentEditor } from "@/components/admin/AssessmentEditor";
import { OrgPageHead, PANEL } from "@/components/company/HiringParts";
import { LoadError, RoleOnly } from "@/components/company/OrgPanels";
import { loadDraft, loadVersions } from "@/lib/company/assessment-data";
import { TEST_NAME_MAX, canWriteTests, contentOf } from "@/lib/company/assessment-rules";
import { requireCompany } from "@/lib/company/auth";
import { ownTest } from "@/lib/company/company-test-data";
import { klymbLibrary, ownLibrary } from "@/lib/company/library-data";
import { db } from "@/lib/db/client";

export const metadata: Metadata = { title: "Edit test", robots: { index: false, follow: false } };

/**
 * The editor for one of the company's own tests: the same fields as Klymb's
 * tests, plus its name. Save keeps a draft; Publish makes the next version,
 * approved for this company. Anyone else's test, or a Klymb test, is a 404.
 */
export default async function EditTestPage({ params }: { params: Promise<{ slug: string; item: string }> }) {
  const { slug, item } = await params;
  const member = await requireCompany(slug);
  const company = `/org/${member.companySlug}`;
  if (!canWriteTests(member)) return <RoleOnly role="admins and recruiters" home={company} />;

  const sql = db();
  if (!sql) return <LoadError what="This test" />;
  const own = await ownTest(sql, member.companyId, item);
  if (own === null) return <LoadError what="This test" />;
  if (!own) notFound();
  const [draft, versions, klymbQs, ownQs] = await Promise.all([loadDraft(sql, item), loadVersions(sql, item), klymbLibrary(sql), ownLibrary(sql, member.companyId)]);
  const crumbs = [{ href: `${company}/assessments`, label: "Assessments" }, { href: `${company}/assessments/${item}`, label: own.title }, { label: "Edit" }];
  if (!draft || !versions) return <><OrgPageHead crumbs={crumbs} title={own.title} /><LoadError what="This test" /></>;
  const latest = versions[0];

  return (
    <>
      <OrgPageHead
        crumbs={crumbs}
        title={`Edit ${own.title}`}
        meta={latest ? <>Version {latest.version} is in use. Publishing makes version {latest.version + 1}; rounds already sent keep theirs.</> : <>Not published yet.</>}
        actions={latest ? <Link href={`${company}/assessments/${item}?tab=preview`} className="text-sm font-semibold underline underline-offset-4">Preview version {latest.version}</Link> : undefined}
      />
      <div className={`${PANEL} p-5 sm:p-7`}>
        <AssessmentEditor
          library={klymbQs && ownQs ? { klymb: klymbQs, mine: ownQs } : undefined}
          slug={item}
          initial={contentOf(draft)}
          revision={draft.revision}
          skills={[]}
          latest={latest ? { version: latest.version, content: contentOf(latest) } : null}
          nextVersion={(latest?.version ?? 0) + 1}
          title={{ value: own.title, max: TEST_NAME_MAX }}
          save={saveOwnTest.bind(null, member.companySlug, item)}
          publish={publishOwnTest.bind(null, member.companySlug, item)}
        />
      </div>
    </>
  );
}
