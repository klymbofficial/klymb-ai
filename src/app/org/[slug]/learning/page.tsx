import type { Metadata } from "next";
import Link from "next/link";
import { EmptyPanel, LoadError, OrgPageTitle } from "@/components/company/OrgPanels";
import { ProgressTable } from "@/components/company/ProgressTable";
import { contact } from "@/data/config";
import { requireCompany } from "@/lib/company/auth";
import { loadProgress } from "@/lib/company/progress-data";
import { db } from "@/lib/db/client";

export const metadata: Metadata = { title: "Learning", robots: { index: false, follow: false } };

const TITLES = { hr: "Learning", head: "Team learning", employee: "My learning" } as const;

const INTROS = {
  hr: "What your people have done on Klymb, where Klymb has a record.",
  head: "What the people on your team have done on Klymb, where Klymb has a record.",
  employee: "What Klymb has recorded under your work email.",
} as const;

/**
 * Learning for every role, each seeing its own slice (loadProgress is scoped
 * by role). Says what the page is built from, because the honest answer is
 * narrow: System Design activity, per email.
 */
export default async function LearningPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const member = await requireCompany(slug);
  const sql = db();
  const progress = sql ? await loadProgress(sql, member) : null;
  const ask = `mailto:${contact.email}?subject=${encodeURIComponent(`Set up a course for our people: ${member.companyName}`)}`;

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
        ) : (
          <>
            {!progress.rows.some((r) => r.hasAccess) && (
              <EmptyPanel
                title={member.role === "employee" ? "No course is set up for you yet" : "No one has a course set up yet"}
                action={member.role === "hr" ? (
                  <a href={ask} className="text-sm font-bold underline underline-offset-4 hover:text-red-deep">Ask Klymb to set one up</a>
                ) : undefined}
              >
                {member.role === "employee"
                  ? "Klymb doesn't record any course against your work email yet."
                  : "Klymb doesn't record System Design, the only course shown here, against any of these emails yet."}
              </EmptyPanel>
            )}
            <ProgressTable rows={progress.rows} total={progress.totalLessons} showTeam={member.role === "hr"} />
          </>
        )}

        <section aria-labelledby="scope" className="border-l-4 border-line/40 pl-4">
          <h2 id="scope" className="text-sm font-extrabold uppercase tracking-[0.14em] text-muted">What this shows</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted">
            <li>System Design: access, lessons passed and final assessment scores. No other course is tracked per person.</li>
            <li>Activity is recorded under the email someone signs in to the course with. A different email won&apos;t appear here.</li>
            <li>It is live, not a report: no export, no certificates, and nothing is emailed.</li>
          </ul>
          {member.role === "hr" && (
            <p className="mt-3 text-sm text-muted">
              Assigning courses or assessments to people isn&apos;t something you can do here yet. To get a course set up,{" "}
              <a href={ask} className="font-semibold text-ink underline underline-offset-2">write to the Klymb team</a>.
            </p>
          )}
        </section>
      </div>
    </>
  );
}
