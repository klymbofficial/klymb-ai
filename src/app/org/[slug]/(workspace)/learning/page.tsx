import clsx from "clsx";
import type { Metadata } from "next";
import Link from "next/link";
import { MyCourseCard } from "@/components/company/learn/LearnerCourse";
import { OrgPageHead, PANEL } from "@/components/company/HiringParts";
import { EmptyPanel, LoadError } from "@/components/company/OrgPanels";
import { AssignCourseButton } from "@/components/company/UpskillPeople";
import { isAdmin, viewOf } from "@/lib/company/access";
import { seesCatalog } from "@/lib/company/catalog";
import { requireCompany } from "@/lib/company/auth";
import { loadProgress } from "@/lib/company/progress-data";
import { assignContext } from "@/lib/company/upskill-assign";
import { getPublishedBrand } from "@/lib/company/branding-data";
import { loadLearner } from "@/lib/company/learner-data";
import { SYSTEM_DESIGN, TRACKED_COURSES, type TrackedCourse } from "@/lib/company/upskill-course";
import { loadCourseView, type CoursePerson } from "@/lib/company/upskill-data";
import { attentionReason, isOverdue, learnerStatus } from "@/lib/company/upskill-view";
import { db } from "@/lib/db/client";

export const metadata: Metadata = { title: "Upskill", robots: { index: false, follow: false } };

const TITLES = { company: "Upskill", team: "Team Upskill", self: "My Upskill" } as const;

/**
 * Upskill (user, 26 Nov): for admins, company heads and team leads, the
 * courses Klymb tracks as cards, like the Assessments list, each with how
 * everyone is doing and who needs a nudge; a card opens the course's own page
 * (learning/[course]). Each sees their widest slice (company or team). An
 * employee sees the courses assigned to them, and learns them right here.
 */
export default async function LearningPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const member = await requireCompany(slug);
  const sql = db();
  const view = viewOf(member);

  // Everyone but an employee sees the course list (user, 26 Nov); an employee sees their own course.
  if (view !== "self") {
    const [course, assign] = sql ? await Promise.all([loadCourseView(sql, member), assignContext(sql, member)]) : [null, undefined];
    const head = (
      <OrgPageHead
        title={TITLES[view]}
        meta={view === "team" ? "Courses your team is taking, and how each person is doing." : "Courses your company tracks, and how each person is doing."}
        actions={
          <>
            {seesCatalog(member) && <Link href={`/org/${member.companySlug}/learning/courses`} className="inline-flex min-h-10 items-center px-2 text-sm font-semibold text-[#1f4fd1] underline-offset-4 hover:underline">Browse catalog</Link>}
            {assign && <AssignCourseButton slug={member.companySlug} course={SYSTEM_DESIGN.title} people={assign.people} teams={assign.teams} canEveryone={assign.canEveryone} />}
          </>
        }
      />
    );
    if (!course || assign === undefined) return <>{head}<LoadError what="Upskill activity" /></>;
    if (!course.people.length) {
      return (
        <>
          {head}
          <EmptyPanel title="Nobody here yet">
            {isAdmin(member) ? <>Add people first. <Link href={`/org/${member.companySlug}/teams`} className="font-semibold text-ink underline underline-offset-2">Go to Team</Link></> : "Your company's admin adds people and chooses who is on a team."}
          </EmptyPanel>
        </>
      );
    }
    return (
      <>
        {head}
        <ul className="flex flex-col gap-4">
          {TRACKED_COURSES.map((c) => <CourseCard key={c.slug} slug={member.companySlug} course={c} people={course.people} total={course.totalLessons} now={new Date()} />)}
        </ul>
        <p className="mt-8 border-t border-line/25 pt-4 text-sm text-muted">More courses appear here as Klymb starts tracking them. Only progress on courses your company assigned is shown; personal course activity stays private.</p>
      </>
    );
  }

  // An employee (user, 26 Nov): the courses assigned to them, each one tap from its next lesson, learned here in the workspace.
  const [me, brand] = await Promise.all([sql ? loadLearner(sql, member) : Promise.resolve(undefined), getPublishedBrand(member)]);
  const own = me === null && sql ? (await loadProgress(sql, member)) : null;
  const ownSeat = own?.status === "ok" && !!own.rows[0]?.ownAccess;
  return (
    <>
      <OrgPageHead title={TITLES[view]} meta="Courses your company has given you. Go at your own pace; your next lesson is always one click away." />
      {me === undefined ? (
        <LoadError what="Your courses" />
      ) : me ? (
        <ul className="flex flex-col gap-4"><MyCourseCard slug={member.companySlug} me={me} company={brand.name} /></ul>
      ) : (
        <EmptyPanel title="Nothing assigned yet">
          When {brand.name} gives you a course, it appears here with its due date, and you can start straight away.
          {ownSeat && <> You also have your own System Design seat: <Link href="/learn/system-design" className="font-semibold text-ink underline underline-offset-2">open it on Klymb.ai</Link>. What you do there stays private.</>}
        </EmptyPanel>
      )}
      <p className="mt-8 border-t border-line/25 pt-4 text-sm text-muted">Progress on courses your company assigned is shared with {brand.name}. Anything you learn on your own stays private.</p>
    </>
  );
}

/** One course on the list: what it is, how everyone is doing in one bar, who needs a nudge, and where to go next. */
function CourseCard({ slug, course, people, total, now }: { slug: string; course: TrackedCourse; people: CoursePerson[]; total: number; now: Date }) {
  const href = `/org/${slug}/learning/${course.slug}`;
  const assigned = people.filter((p) => p.assigned);
  const by = (s: string) => assigned.filter((p) => learnerStatus(p, total) === s).length;
  const done = by("completed");
  const going = by("in_progress");
  const waiting = by("not_started");
  const share = (n: number) => (assigned.length ? (n / assigned.length) * 100 : 0);
  const avg = assigned.length ? Math.round(assigned.reduce((s, p) => s + (total ? p.lessonsPassed / total : 0), 0) / assigned.length * 100) : 0;
  const finals = assigned.filter((p) => p.finalBest !== null);
  const finalAvg = finals.length ? Math.round(finals.reduce((s, p) => s + p.finalBest!, 0) / finals.length) : null;
  const overdue = assigned.filter((p) => isOverdue(p, total, now)).length;
  const nudge = assigned.filter((p) => attentionReason(p, total, now)).length;
  return (
    <li className={clsx(PANEL, "flex flex-col gap-4 p-5 shadow-sm")}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold"><Link href={href} className="underline-offset-4 hover:underline">{course.title}</Link></h2>
          <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
            <span>Klymb course</span>
            <span>{course.lessons.length} lessons · {course.modules.length} modules</span>
            <span>About {Math.round(course.videoMinutes / 60 * 10) / 10} hours of video</span>
            <span>Final: {course.finalMark}% to pass</span>
          </p>
        </div>
        {nudge > 0 && (
          <Link href={`${href}?tab=people`} className="inline-flex items-center gap-1.5 rounded-full bg-[#fdf1e7] px-3 py-1 text-xs font-bold text-[#6b3300] hover:underline">
            {nudge} {nudge === 1 ? "person needs" : "people need"} a nudge{overdue ? ` · ${overdue} overdue` : ""}
          </Link>
        )}
      </div>

      {assigned.length === 0 ? (
        <p className="text-sm text-muted">Not assigned to anyone yet.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          <div>
            <p className="text-sm"><strong className="tabular-nums">{assigned.length}</strong> assigned · <strong className="tabular-nums">{going}</strong> in progress · <strong className="tabular-nums">{done}</strong> completed</p>
            <div aria-hidden="true" className="mt-2 flex h-2.5 overflow-hidden rounded-full bg-[#e8e6e5]">
              <span className="h-full bg-[#15803d]" style={{ width: `${share(done)}%` }} />
              <span className="h-full bg-[#1f4fd1]" style={{ width: `${share(going)}%` }} />
            </div>
            <p className="mt-2 flex flex-wrap gap-x-4 text-xs text-muted">
              <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-[#15803d]" />Completed {done}</span>
              <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-[#1f4fd1]" />In progress {going}</span>
              <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-[#d4d2d1]" />Not started {waiting}</span>
            </p>
          </div>
          <dl className="flex gap-6 text-right">
            <div><dt className="text-xs text-muted">Average progress</dt><dd className="text-2xl font-semibold tabular-nums">{avg}%</dd></div>
            <div><dt className="text-xs text-muted">Final average</dt><dd className="text-2xl font-semibold tabular-nums">{finalAvg === null ? "—" : `${finalAvg}%`}</dd></div>
          </dl>
        </div>
      )}

      <div className="flex flex-wrap gap-x-6 gap-y-2 border-t border-line/20 pt-3 text-sm font-semibold">
        <Link href={href} className="text-[#1f4fd1] hover:underline">View progress</Link>
        <Link href={`${href}?tab=people`} className="text-[#1f4fd1] hover:underline">People</Link>
        <Link href={`/org/${slug}/learning/courses/${course.slug}`} className="text-[#1f4fd1] hover:underline">Preview course</Link>
      </div>
    </li>
  );
}
