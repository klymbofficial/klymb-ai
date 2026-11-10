import type { Metadata } from "next";
import Link from "next/link";
import { AssignmentControls } from "@/components/company/AssignmentControls";
import { CourseAccessSteps } from "@/components/company/CourseAccessSteps";
import { EmptyPanel, LoadError, OrgPageTitle } from "@/components/company/OrgPanels";
import { ProgressTable } from "@/components/company/ProgressTable";
import { requireCompany } from "@/lib/company/auth";
import { loadProgress } from "@/lib/company/progress-data";
import { db } from "@/lib/db/client";

export const metadata: Metadata = { title: "Learning", robots: { index: false, follow: false } };

const TITLES = { hr: "Learning", head: "Team learning", employee: "My learning" } as const;

const INTROS = {
  hr: "Assign System Design to your people, and see what they have done with it.",
  head: "What the people on your team have done on Klymb, where Klymb has a record.",
  employee: "The course your company has assigned to you, and what Klymb has recorded under your work email.",
} as const;

/**
 * Learning for every role, each seeing its own slice (loadProgress is scoped
 * by role). HR also assigns and removes the course here. The notes say what
 * the page is built from, because the honest answer is narrow: System Design,
 * per email.
 */
export default async function LearningPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const member = await requireCompany(slug);
  const sql = db();
  const progress = sql ? await loadProgress(sql, member) : null;

  return (
    <>
      <OrgPageTitle title={TITLES[member.role]} intro={INTROS[member.role]} />
      <div className="flex flex-col gap-8">
        {!progress || progress.status === "unavailable" ? (
          <LoadError what="Learning activity" />
        ) : progress.rows.length === 0 ? (
          <EmptyPanel title="Nobody to show yet">
            {member.role === "hr" ? (
              <>Add people first. <Link href={`/org/${member.companySlug}/people`} className="font-semibold text-ink underline underline-offset-2">Go to People</Link></>
            ) : (
              "There is nobody on your team yet. HR adds people and chooses who is on a team."
            )}
          </EmptyPanel>
        ) : member.role === "hr" ? (
          <AssignmentControls slug={member.companySlug} rows={progress.rows} total={progress.totalLessons} seats={progress.seatCount} />
        ) : (
          <>
            {!progress.rows.some((r) => r.hasAccess) && (
              <EmptyPanel title={member.role === "employee" ? "No course is assigned to you yet" : "No one on your team has the course yet"}>
                {member.role === "employee"
                  ? "Your HR contact assigns System Design to people. Until they assign it to you, you can't open the course."
                  : "HR assigns System Design to people. You see your team's progress here once they do."}
              </EmptyPanel>
            )}
            <ProgressTable rows={progress.rows} total={progress.totalLessons} showTeam={false} />
          </>
        )}

        {member.role === "employee" && progress?.status === "ok" && <CourseAccessSteps email={member.email} hasAccess={!!progress.rows[0]?.hasAccess} />}

        <section aria-labelledby="scope" className="border-l-4 border-line/40 pl-4">
          <h2 id="scope" className="text-sm font-extrabold uppercase tracking-[0.14em] text-muted">What this shows</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted">
            <li>System Design, the one course a company can assign for now: who has it, lessons passed and final assessment scores. Other courses and assessments can&apos;t be assigned yet.</li>
            <li>Activity is recorded under the email someone signs in to the course with. A different email won&apos;t appear here.</li>
            <li>It is live, not a report: no export, no certificates, and nothing is emailed.</li>
          </ul>
        </section>
      </div>
    </>
  );
}
