import type { Metadata } from "next";
import Link from "next/link";
import { AssignmentHistory, NeedsAttention } from "@/components/company/AssignmentParts";
import { AssignmentControls } from "@/components/company/AssignmentControls";
import { CourseAccessSteps } from "@/components/company/CourseAccessSteps";
import { LearningSummary } from "@/components/company/LearningSummary";
import { EmptyPanel, LoadError, OrgPageTitle } from "@/components/company/OrgPanels";
import { ProgressTable } from "@/components/company/ProgressTable";
import { isAdmin, viewOf } from "@/lib/company/access";
import { listAssignments, loadAssignPeople, loadTeams } from "@/lib/company/assign-data";
import { assignerFor, requireCompany } from "@/lib/company/auth";
import { loadProgress } from "@/lib/company/progress-data";
import { db } from "@/lib/db/client";
import { SD_COURSE } from "@/lib/sd-offer";

export const metadata: Metadata = { title: "Learning", robots: { index: false, follow: false } };

const TITLES = { company: "Learning", team: "Team learning", self: "My learning" } as const;

/**
 * Learning for every member, each seeing their widest slice (loadProgress is
 * scoped by responsibility: company, team or self). Whoever assigns (an
 * admin for the company, a team lead for their team) gets the one primary
 * action, Assign course, then who needs attention, the table, and the
 * assignments made so far. A company head reads; an employee sees their own.
 */
export default async function LearningPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const member = await requireCompany(slug);
  const sql = db();
  const view = viewOf(member);
  const assigner = await assignerFor(slug);
  const teamScope = assigner?.scope.kind === "team" ? assigner.scope.teamId : null;

  const [progress, people, teams, history] = await Promise.all([
    sql ? loadProgress(sql, member) : null,
    sql && assigner ? loadAssignPeople(sql, member.companyId, SD_COURSE) : null,
    sql && assigner ? loadTeams(sql, member.companyId) : null,
    sql && assigner ? listAssignments(sql, member.companyId, teamScope) : null,
  ]);

  const teamName = new Map((teams ?? []).map((t) => [t.id, t.name]));
  const panelPeople = (people ?? [])
    .filter((p) => !teamScope || p.teamId === teamScope)
    .map((p) => ({ email: p.email, name: p.name, teamName: p.teamId ? (teamName.get(p.teamId) ?? null) : null, has: p.assigned || p.ownAccess }));
  const panelTeams = (teams ?? []).filter((t) => !teamScope || t.id === teamScope);

  return (
    <>
      <OrgPageTitle title={TITLES[view]} />
      <div className="flex flex-col gap-10">
        {!progress || progress.status === "unavailable" || (assigner && (!people || !teams)) ? (
          <LoadError what="Learning activity" />
        ) : progress.rows.length === 0 ? (
          <EmptyPanel title="Nobody here yet">
            {isAdmin(member) ? (
              <>Add people first. <Link href={`/org/${member.companySlug}/people`} className="font-semibold text-ink underline underline-offset-2">Go to People</Link></>
            ) : (
              "Your company's admin adds people and chooses who is on a team."
            )}
          </EmptyPanel>
        ) : assigner ? (
          <AssignmentControls
            slug={member.companySlug}
            rows={progress.rows}
            total={progress.totalLessons}
            showTeam={view === "company"}
            people={panelPeople}
            teams={panelTeams}
            canEveryone={assigner.scope.kind === "company"}
            between={
              <>
                <NeedsAttention rows={progress.rows} total={progress.totalLessons} />
                {isAdmin(member) && <LearningSummary rows={progress.rows} totalLessons={progress.totalLessons} teamsHref={`/org/${member.companySlug}/teams`} />}
              </>
            }
          />
        ) : view === "company" ? (
          <>
            <NeedsAttention rows={progress.rows} total={progress.totalLessons} />
            <LearningSummary rows={progress.rows} totalLessons={progress.totalLessons} />
            <ProgressTable rows={progress.rows} total={progress.totalLessons} showTeam showDue />
          </>
        ) : (
          <>
            {!progress.rows.some((r) => r.hasAccess) && (
              <EmptyPanel title={view === "self" ? "No course assigned to you yet" : "No one on your team has the course yet"}>
                Your company&apos;s admin assigns courses.
              </EmptyPanel>
            )}
            <ProgressTable rows={progress.rows} total={progress.totalLessons} showTeam={false} showDue />
          </>
        )}

        {assigner && history && <AssignmentHistory list={history} />}

        {view === "self" && progress?.status === "ok" && <CourseAccessSteps email={member.email} hasAccess={!!progress.rows[0]?.hasAccess} />}

        <ul className="list-disc space-y-1 border-t border-line/25 pt-5 pl-5 text-xs text-muted">
          <li>Activity is recorded under the email someone signs in to the course with.</li>
          <li>Only courses your company assigned are shown. What someone learns on their own account stays theirs.</li>
        </ul>
      </div>
    </>
  );
}
