import type { Metadata } from "next";
import Link from "next/link";
import { BatchList, type BatchRow } from "@/components/company/BatchList";
import { BTN_PRIMARY, OrgPageHead } from "@/components/company/HiringParts";
import { OrgIcon } from "@/components/company/OrgIcons";
import { EmptyPanel, LoadError, RoleOnly } from "@/components/company/OrgPanels";
import { requireCompany } from "@/lib/company/auth";
import { listBatches } from "@/lib/company/batch-data";
import { canSchedule, durationText, formatInZone, seesHiring } from "@/lib/company/batch-rules";
import { batchStateKey } from "@/lib/company/batch-view";
import { db } from "@/lib/db/client";

export const metadata: Metadata = { title: "Hiring batches", robots: { index: false, follow: false } };

const people = (n: number) => (n === 1 ? "1 person" : `${n} people`);

/**
 * The company's hiring batches: each one's test, role, window and how its
 * invitations went, with a status rail and a search. Recruiters make new
 * ones; admins and company heads look.
 */
export default async function HiringPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const member = await requireCompany(slug);
  const base = `/org/${member.companySlug}/hiring`;
  if (!seesHiring(member)) return <RoleOnly role="recruiters and admins" home={`/org/${member.companySlug}`} />;

  const sql = db();
  const batches = sql ? await listBatches(sql, member.companyId) : null;
  const recruiter = canSchedule(member);
  const action = recruiter ? (
    <Link href={`${base}/new`} className={BTN_PRIMARY}>
      <OrgIcon name="plus" size={16} />
      New batch
    </Link>
  ) : undefined;
  const head = <OrgPageHead title="Hiring batches" meta="Each batch invites people to one approved test, within its own window." actions={action} />;
  if (!batches) return <>{head}<LoadError what="Hiring batches" /></>;
  if (!batches.length) {
    return (
      <>
        {head}
        <EmptyPanel title="No batches yet">
          {recruiter ? "A batch invites a group of candidates to one test, with a window to take it in." : "Recruiters make batches. Ask one to start, or an admin to give someone that role."}
        </EmptyPanel>
      </>
    );
  }

  const now = new Date();
  const rows: BatchRow[] = batches.map((b) => {
    const state = batchStateKey(b, now);
    return {
      id: b.id,
      href: `${base}/${b.id}`,
      role: b.role,
      title: b.title,
      version: b.version,
      allowed: durationText(b.minutes),
      window: `${formatInZone(b.opensAt, b.timeZone)} to ${formatInZone(b.closesAt, b.timeZone)} (${b.timeZone.replace(/_/g, " ")})`,
      state,
      createdAt: b.createdAt,
      opensAt: b.opensAt,
      closesAt: b.closesAt,
      summary: b.status === "draft" ? `${people(b.active)} to invite · nothing sent yet` : `${b.active} invited · ${b.sent} sent`,
      failed: b.status === "sent" ? b.failed : 0,
      action: b.status === "draft" ? (recruiter ? "Preview and send" : "View draft") : "View candidates",
    };
  });

  return (
    <>
      {head}
      <BatchList rows={rows} />
    </>
  );
}
