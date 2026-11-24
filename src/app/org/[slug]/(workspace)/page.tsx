import type { Metadata } from "next";
import Link from "next/link";
import { EmptyPanel, LoadError, OrgPageTitle, Stat } from "@/components/company/OrgPanels";
import { BarChart, ChartPanel, CHART_COLOR, ProgressRing } from "@/components/company/OrgCharts";
import { LearningSummary } from "@/components/company/LearningSummary";
import { UpskillCourseCard } from "@/components/company/UpskillCourseCard";
import { OrgIcon } from "@/components/company/OrgIcons";
import { isAdmin, viewOf } from "@/lib/company/access";
import { seesHiring } from "@/lib/company/batch-rules";
import { requireCompany } from "@/lib/company/auth";
import { getPublishedBrand } from "@/lib/company/branding-data";
import { loadCompanyPeople } from "@/lib/company/people-data";
import { loadProgress } from "@/lib/company/progress-data";
import { db } from "@/lib/db/client";

export const metadata: Metadata = { title: "Overview", robots: { index: false, follow: false } };

export default async function OrgHome({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const member = await requireCompany(slug);
  const brand = await getPublishedBrand(member);
  const welcome = brand.welcome && <section aria-label={`A welcome from ${brand.name}`} className="mb-6 border-l-4 border-red-strong bg-white px-5 py-4"><p className="text-base">{brand.welcome}</p></section>;
  const sql = db();
  const base = `/org/${member.companySlug}`;

  if (isAdmin(member)) {
    const data = sql ? await loadCompanyPeople(sql, member.companyId) : null;
    const teamItems = data ? [
      ...data.teams.map((team) => ({ label: team.name, value: team.members, color: CHART_COLOR.blue })),
      { label: "No team assigned", value: data.active.filter((person) => !person.team_id).length, color: CHART_COLOR.slate },
    ] : [];
    return (
      <>
        {welcome}
        <OrgPageTitle title={brand.name} intro="Your workforce at a glance." />
        {!data ? <LoadError what="Your company's details" /> : (
          <div className="flex flex-col gap-5">
            <div className="grid gap-3 sm:grid-cols-3">
              <Stat label="People" value={data.active.length} note="Active members and invitations" />
              <Stat label="Teams" value={data.teams.length} />
              <Stat label="Available seats" value={Math.max(0, data.seatCount - data.active.length)} note={`${data.seatCount} seats in your plan`} />
            </div>
            <div className="grid gap-5 xl:grid-cols-2">
              <ChartPanel title="Seat usage" note={`${data.active.length} of ${data.seatCount} seats used`} action={<Link href={`${base}/people`} className="text-sm font-semibold underline underline-offset-4">Manage people</Link>}>
                <div className="flex justify-center py-2"><ProgressRing value={data.active.length} total={data.seatCount} label="seats used" /></div>
              </ChartPanel>
              <ChartPanel title="People by team" note="Current team membership" action={<Link href={`${base}/teams`} className="text-sm font-semibold underline underline-offset-4">Manage teams</Link>}>
                <BarChart items={teamItems} label="People per team" total={data.active.length} />
              </ChartPanel>
            </div>
            {data.active.length <= 1 && <EmptyPanel title="Build your team" action={<Link href={`${base}/people`} className="text-sm font-bold underline underline-offset-4">Add people</Link>}>Add individually or import a CSV.</EmptyPanel>}
            <section aria-label="Quick actions">
              <h2 className="text-base font-bold">Quick actions</h2>
              <ul className="mt-3 grid gap-3 sm:grid-cols-3">
                <ShortcutCard href={`${base}/learning`} title="Upskill" body="Assign courses & track progress" icon="learning" />
                <ShortcutCard href={`${base}/assessments`} title="Assessments" body="Review & approve tests" icon="assessments" />
                <ShortcutCard href={`${base}/assessments`} title="Assessments" body="Tests, candidates & invitations" icon="assessments" />
              </ul>
            </section>
          </div>
        )}
      </>
    );
  }

  const progress = sql ? await loadProgress(sql, member) : ({ status: "unavailable" } as const);
  const view = viewOf(member);
  return (
    <>
      {welcome}
      <OrgPageTitle title={view === "company" ? brand.name : view === "team" ? "Your team" : "Overview"} intro={view === "company" ? "Company-wide Upskill progress." : view === "team" ? "Your team's Upskill progress." : "Your courses and progress."} />
      <div className="flex flex-col gap-5">
        {progress.status === "unavailable" ? <LoadError what="Upskill" /> : !progress.rows.length ? <EmptyPanel title="No people in this view yet" /> : view === "self" ? (
          <UpskillCourseCard person={progress.rows[0]} total={progress.totalLessons} />
        ) : (
          <><LearningSummary rows={progress.rows} totalLessons={progress.totalLessons} compact /><Link href={`${base}/learning`} className="text-sm font-bold underline underline-offset-4">Open Upskill</Link></>
        )}
        {seesHiring(member) && <ul><ShortcutCard href={`${base}/assessments`} title="Assessments" body="Tests, candidates & invitations" icon="assessments" /></ul>}
      </div>
    </>
  );
}

function ShortcutCard({ href, title, body, icon }: { href: string; title: string; body: string; icon: "learning" | "assessments" | "batches" }) {
  return <li><Link href={href} className="flex h-full items-start gap-3 rounded-lg border border-line/30 bg-white p-5 transition-colors hover:border-red-strong"><span className="rounded-md bg-slate-100 p-2 text-ink"><OrgIcon name={icon} /></span><div><h3 className="font-bold">{title}</h3><p className="mt-1 text-sm text-muted">{body}</p></div></Link></li>;
}
