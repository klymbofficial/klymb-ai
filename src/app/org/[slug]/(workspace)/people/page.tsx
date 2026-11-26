import type { Metadata } from "next";
import { OrgPageHead } from "@/components/company/HiringParts";
import { LoadError, RoleOnly } from "@/components/company/OrgPanels";
import { PeopleDirectory } from "@/components/company/PeopleDirectory";
import { requireCompany } from "@/lib/company/auth";
import { seesHiring } from "@/lib/company/batch-rules";
import { loadCandidatePeople } from "@/lib/company/candidate-people";
import { db } from "@/lib/db/client";

export const metadata: Metadata = { title: "People", robots: { index: false, follow: false } };

/**
 * People outside the company (user, 26 Nov): everyone invited to an
 * external test, with each test's status, score and decision. Those who see
 * hiring open it; the company's own members are on the Team page.
 */
export default async function PeoplePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const member = await requireCompany(slug);
  if (!seesHiring(member)) return <RoleOnly role="recruiters, reviewers and admins" home={`/org/${member.companySlug}`} />;
  const sql = db();
  const people = sql ? await loadCandidatePeople(sql, member, new Date()) : null;
  return (
    <>
      <OrgPageHead title="People" meta="Everyone you've invited to a test from outside the company." />
      {people ? <PeopleDirectory people={people} /> : <LoadError what="Your candidates" />}
    </>
  );
}
