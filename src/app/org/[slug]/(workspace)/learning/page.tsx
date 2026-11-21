import type { Metadata } from "next";
import Link from "next/link";
import { AssignmentControls } from "@/components/company/AssignmentControls";
import { CourseAccessSteps } from "@/components/company/CourseAccessSteps";
import { LearningSummary } from "@/components/company/LearningSummary";
import { EmptyPanel, LoadError, OrgPageTitle } from "@/components/company/OrgPanels";
import { ProgressTable } from "@/components/company/ProgressTable";
import { isAdmin, viewOf } from "@/lib/company/access";
import { requireCompany } from "@/lib/company/auth";
import { loadProgress } from "@/lib/company/progress-data";
import { db } from "@/lib/db/client";

export const metadata: Metadata = { title: "Learning", robots: { index: false, follow: false } };

const TITLES = { company: "Learning", team: "Team learning", self: "My learning" } as const;

const INTROS = {
  admin: "Assign System Design to your people, and see what they have done with it.",
  company: "What people across the company have done with the courses the company assigned.",
  team: "What the people on your team have done with the courses the company assigned.",
  self: "The course your company has assigned to you, and what Klymb has recorded under your work email.",
} as const;

/**
 * Learning for every member, each seeing their widest slice (loadProgress is
 * scoped by responsibility: company, team or self). Admins also assign and
 * remove the course here. The notes say what
 * the page is built from, because the honest answer is narrow: System Design,
 * per email.
 */
export default async function LearningPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const member = await requireCompany(slug);
  const sql = db();
  const progress = sql ? await loadProgress(sql, member) : null;
  const view = viewOf(member);
  const admin = isAdmin(member);

  return (
    <>
      <OrgPageTitle title={TITLES[view]} intro={admin ? INTROS.admin : INTROS[view]} />
      <div className="flex flex-col gap-8">
        {!progress || progress.status === "unavailable" ? (
          <LoadError what="Learning activity" />
        ) : progress.rows.length === 0 ? (
          <EmptyPanel title="Nobody to show yet">
            {admin ? (
              <>Add people first. <Link href={`/org/${member.companySlug}/people`} className="font-semibold text-ink underline underline-offset-2">Go to People</Link></>
            ) : (
              "There is nobody here yet. Your company's admin adds people and chooses who is on a team."
            )}
          </EmptyPanel>
        ) : admin ? (
          <>
            {/* Admins only: the rows are the ones loadProgress scoped to this admin (the whole company). */}
            <LearningSummary rows={progress.rows} totalLessons={progress.totalLessons} teamsHref={`/org/${member.companySlug}/teams`} />
            <AssignmentControls slug={member.companySlug} rows={progress.rows} total={progress.totalLessons} seats={progress.seatCount} />
          </>
        ) : view === "company" ? (
          <>
            {/* A company head reads the whole company and changes nothing. */}
            <LearningSummary rows={progress.rows} totalLessons={progress.totalLessons} />
            <ProgressTable rows={progress.rows} total={progress.totalLessons} showTeam />
          </>
        ) : (
          <>
            {!progress.rows.some((r) => r.hasAccess) && (
              <EmptyPanel title={view === "self" ? "No course is assigned to you yet" : "No one on your team has the course yet"}>
                {view === "self"
                  ? "Your company's admin assigns System Design to people. Until they assign it to you, you can't open the course."
                  : "Your company's admin assigns System Design to people. You see your team's progress here once they do."}
              </EmptyPanel>
            )}
            <ProgressTable rows={progress.rows} total={progress.totalLessons} showTeam={false} />
          </>
        )}

        {view === "self" && progress?.status === "ok" && <CourseAccessSteps email={member.email} hasAccess={!!progress.rows[0]?.hasAccess} />}

        <section aria-labelledby="scope" className="border-l-4 border-line/40 pl-4">
          <h2 id="scope" className="text-sm font-extrabold uppercase tracking-[0.14em] text-muted">What this shows</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted">
            <li>System Design, the one course a company can assign for now: who has it, lessons passed and final assessment scores. Other courses and assessments can&apos;t be assigned yet.</li>
            <li>Activity is recorded under the email someone signs in to the course with. A different email won&apos;t appear here.</li>
            <li>Only courses the company assigned are shown. What someone learns on their own Klymb account stays theirs: at most it shows that they have their own access.</li>
            <li>It is live, not a report: no export, no certificates, and nothing is emailed.</li>
          </ul>
        </section>
      </div>
    </>
  );
}
