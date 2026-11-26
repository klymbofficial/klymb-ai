import type { Metadata } from "next";
import Link from "next/link";
import { BatchForm } from "@/components/company/BatchForm";
import { OrgPageHead } from "@/components/company/HiringParts";
import { EmptyPanel, LoadError, RoleOnly } from "@/components/company/OrgPanels";
import { requireCompany } from "@/lib/company/auth";
import { hiringOptions } from "@/lib/company/batch-data";
import { canSchedule } from "@/lib/company/batch-rules";
import { inviteDefaults as defaults, timeZoneList as timeZones } from "@/lib/company/invite-defaults";
import { loadCompanyPeople } from "@/lib/company/people-data";
import { db } from "@/lib/db/client";

export const metadata: Metadata = { title: "Invite candidates", robots: { index: false, follow: false } };

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
      <BatchForm slug={member.companySlug} tests={options.tests} reviewers={options.reviewers} prepCourses={options.prepCourses} timeZones={timeZones()} initial={{ ...defaults(new Date()), test: typeof asked === "string" ? asked : undefined, reviewer: member.email }}
        company={people ? {
          people: people.active.map((p) => ({ email: p.email, name: p.name, teamId: p.team_id })),
          teams: people.teams.map((t) => ({ id: t.id, name: t.name, members: t.members })),
        } : undefined}
      />
    </>
  );
}
