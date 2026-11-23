import type { Metadata } from "next";
import Link from "next/link";
import { BatchForm } from "@/components/company/BatchForm";
import { OrgPageHead } from "@/components/company/HiringParts";
import { EmptyPanel, LoadError, RoleOnly } from "@/components/company/OrgPanels";
import { requireCompany } from "@/lib/company/auth";
import { hiringOptions } from "@/lib/company/batch-data";
import { DEFAULT_TIME_ZONE, canSchedule, toZonedInput } from "@/lib/company/batch-rules";
import { db } from "@/lib/db/client";

export const metadata: Metadata = { title: "New hiring batch", robots: { index: false, follow: false } };

/** Every zone the server knows, India and UTC first; Node still calls India "Asia/Calcutta". */
function timeZones(): string[] {
  const all = Intl.supportedValuesOf("timeZone").filter((z) => z !== "Asia/Calcutta" && z !== "UTC");
  return [DEFAULT_TIME_ZONE, "UTC", ...all];
}

/** Tomorrow at 10:00 and a week later at 18:00, in India time: a starting point to change. */
function defaults(now: Date) {
  const day = (n: number) => toZonedInput(new Date(now.getTime() + n * 86400000), DEFAULT_TIME_ZONE).slice(0, 10);
  return { timeZone: DEFAULT_TIME_ZONE, opens: `${day(1)}T10:00`, closes: `${day(8)}T18:00` };
}

export default async function NewBatchPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const member = await requireCompany(slug);
  const base = `/org/${member.companySlug}/hiring`;
  if (!canSchedule(member)) return <RoleOnly role="recruiters" home={`/org/${member.companySlug}`} />;

  const title = (
    <OrgPageHead
      crumbs={[{ href: base, label: "Hiring batches" }, { label: "New batch" }]}
      title="New batch"
      meta="Pick the test and the window, add the candidates, then preview the invitation before anything is sent."
    />
  );
  const sql = db();
  const options = sql ? await hiringOptions(sql, member.companyId) : null;
  if (!options) return <>{title}<LoadError what="The batch form" /></>;

  if (!options.tests.length) {
    return (
      <>
        {title}
        <EmptyPanel title="No approved test yet" action={<Link href={`/org/${member.companySlug}/assessments`} className="text-sm font-bold underline underline-offset-4">Open Assessments</Link>}>
          A reviewer in your company approves a version of a test first. Then you can invite candidates to it.
        </EmptyPanel>
      </>
    );
  }
  if (!options.reviewers.length) {
    return (
      <>
        {title}
        <EmptyPanel title="No reviewer yet">Every batch names a reviewer to score it. Ask an admin to give someone the reviewer role on People.</EmptyPanel>
      </>
    );
  }

  return (
    <>
      {title}
      <BatchForm slug={member.companySlug} tests={options.tests} reviewers={options.reviewers} prepCourses={options.prepCourses} timeZones={timeZones()} initial={defaults(new Date())} />
    </>
  );
}
