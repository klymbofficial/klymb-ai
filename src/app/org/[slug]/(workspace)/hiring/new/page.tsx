import type { Metadata } from "next";
import Link from "next/link";
import { BatchForm } from "@/components/company/BatchForm";
import { OrgPageHead } from "@/components/company/HiringParts";
import { EmptyPanel, LoadError, RoleOnly } from "@/components/company/OrgPanels";
import { requireCompany } from "@/lib/company/auth";
import { hiringOptions } from "@/lib/company/batch-data";
import { DEFAULT_TIME_ZONE, canSchedule, toZonedInput } from "@/lib/company/batch-rules";
import { loadCompanyPeople } from "@/lib/company/people-data";
import { db } from "@/lib/db/client";

export const metadata: Metadata = { title: "Invite candidates", robots: { index: false, follow: false } };

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

export default async function NewBatchPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ test?: string | string[] }> }) {
  const { slug } = await params;
  const asked = (await searchParams).test;
  const member = await requireCompany(slug);
  if (!canSchedule(member)) return <RoleOnly role="admins and recruiters" home={`/org/${member.companySlug}`} />;

  const title = (
    <OrgPageHead
      crumbs={[{ href: `/org/${member.companySlug}/assessments`, label: "Assessments" }, { label: "Invite candidates" }]}
      title="Invite candidates"
      meta="Pick the test and the window, add people, then preview the invitation before anything is sent."
    />
  );
  const sql = db();
  const [options, people] = sql ? await Promise.all([hiringOptions(sql, member.companyId), loadCompanyPeople(sql, member.companyId)]) : [null, null];
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
      <BatchForm slug={member.companySlug} tests={options.tests} reviewers={options.reviewers} prepCourses={options.prepCourses} timeZones={timeZones()} initial={{ ...defaults(new Date()), test: typeof asked === "string" ? asked : undefined }}
        company={people ? {
          people: people.active.map((p) => ({ email: p.email, name: p.name, teamId: p.team_id })),
          teams: people.teams.map((t) => ({ id: t.id, name: t.name, members: t.members })),
        } : undefined}
      />
    </>
  );
}
