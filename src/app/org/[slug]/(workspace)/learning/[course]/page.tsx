import clsx from "clsx";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AssignmentHistory } from "@/components/company/AssignmentParts";
import { LearnerCourseHome } from "@/components/company/learn/LearnerCourse";
import { OrgPageHead } from "@/components/company/HiringParts";
import { PendingDot } from "@/components/company/NavFeedback";
import { EmptyPanel, LoadError } from "@/components/company/OrgPanels";
import { AssignCourseButton, UpskillPeople } from "@/components/company/UpskillPeople";
import { viewOf } from "@/lib/company/access";
import { requireCompany } from "@/lib/company/auth";
import { seesCatalog } from "@/lib/company/catalog";
import { assignContext } from "@/lib/company/upskill-assign";
import { getPublishedBrand } from "@/lib/company/branding-data";
import { loadLearner } from "@/lib/company/learner-data";
import { trackedCourse } from "@/lib/company/upskill-course";
import { loadCourseView } from "@/lib/company/upskill-data";
import { PEOPLE_FILTERS, attentionReason, biggestDrop, courseFunnel, hardestLessons, learnerStatus, lessonStats, type PeopleFilter } from "@/lib/company/upskill-view";
import { db } from "@/lib/db/client";

export const metadata: Metadata = { title: "Upskill course", robots: { index: false, follow: false } };

type Tab = "overview" | "people";
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const pct = (n: number, d: number) => (d ? Math.round((n / d) * 100) : 0);

/**
 * One tracked course (user, 26 Nov), laid out like a test in Assessments:
 * breadcrumb, title, Preview and Assign on the right, then two tabs.
 * Overview answers "how is it going?" at a glance: four numbers, the funnel,
 * who needs a nudge and why, the hardest lessons, and lesson by lesson where
 * people stop. People is everyone, filterable, with a side panel each.
 * An employee sees their own course home instead: what's next, the whole
 * course as a checklist, and the final.
 */
export default async function UpskillCoursePage({ params, searchParams }: { params: Promise<{ slug: string; course: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { slug, course: courseSlug } = await params;
  const sp = await searchParams;
  const member = await requireCompany(slug);
  const course = trackedCourse(courseSlug);
  if (!course) notFound();
  const base = `/org/${member.companySlug}/learning`;
  const sql = db();
  // An employee learns the course here (user, 26 Nov); a course not assigned to them goes back to My Upskill.
  if (viewOf(member) === "self") {
    const [me, brand] = await Promise.all([sql ? loadLearner(sql, member) : Promise.resolve(undefined), getPublishedBrand(member)]);
    if (me === null) redirect(base);
    if (!me) return <><OrgPageHead crumbs={[{ href: base, label: "My Upskill" }, { label: course.title }]} title={course.title} /><LoadError what="Your course" /></>;
    return <LearnerCourseHome slug={member.companySlug} me={me} company={brand.name} home={base} />;
  }

  const [view, assign] = sql ? await Promise.all([loadCourseView(sql, member), assignContext(sql, member)]) : [null, undefined];
  const crumbs = [{ href: base, label: "Upskill" }, { label: course.title }];
  if (!view || assign === undefined) return <><OrgPageHead crumbs={crumbs} title={course.title} /><LoadError what="This course's progress" /></>;

  const now = new Date();
  const total = view.totalLessons;
  const assigned = view.people.filter((p) => p.assigned);
  const tab: Tab = one(sp.tab) === "people" ? "people" : "overview";
  const href = (t: Tab, extra = "") => `${base}/${course.slug}${t === "people" ? `?tab=people${extra}` : ""}`;
  const previewHref = seesCatalog(member) ? `${base}/courses/${course.slug}` : null;

  const head = (
    <>
      <OrgPageHead
        crumbs={crumbs}
        title={course.title}
        meta={<><span>{course.lessons.length} lessons · {course.modules.length} modules</span><span>About {Math.round(course.videoMinutes / 60 * 10) / 10} hours of video</span><span>Final: {course.finalMark}% to pass, {course.finalTries} tries</span></>}
        actions={
          <>
            {previewHref && <Link href={previewHref} className="inline-flex min-h-10 items-center gap-1.5 px-2 text-sm font-semibold text-[#1f4fd1] underline-offset-4 hover:underline">Preview course</Link>}
            {assign && <AssignCourseButton slug={member.companySlug} course={course.title} people={assign.people} teams={assign.teams} canEveryone={assign.canEveryone} />}
          </>
        }
      />
      <nav aria-label="Course sections" className="-mt-2 mb-6 flex gap-1 overflow-x-auto border-b border-line/40">
        {(["overview", "people"] as const).map((t) => (
          <Link key={t} href={href(t)} aria-current={t === tab ? "page" : undefined} className={clsx("-mb-px whitespace-nowrap border-b-[3px] px-4 py-3 text-sm font-semibold uppercase tracking-wide", t === tab ? "border-[#1f4fd1] text-[#1f4fd1]" : "border-transparent text-ink hover:text-[#1f4fd1]")}>
            {t === "overview" ? "Overview" : `People (${assigned.length})`}
            <PendingDot />
          </Link>
        ))}
      </nav>
    </>
  );

  if (tab === "people") {
    const asked = one(sp.f) as PeopleFilter | undefined;
    const filter = PEOPLE_FILTERS.some((f) => f.key === asked) ? asked! : "all";
    return (
      <>
        {head}
        <UpskillPeople
          slug={member.companySlug}
          course={course}
          people={view.people}
          totalLessons={total}
          now={now.toISOString()}
          canAssign={!!assign}
          showTeam={viewOf(member) === "company"}
          assign={assign ? { people: assign.people, teams: assign.teams, canEveryone: assign.canEveryone } : null}
          initialFilter={filter}
          initialPerson={one(sp.person) ?? null}
        />
      </>
    );
  }

  if (!assigned.length) {
    return (
      <>
        {head}
        <EmptyPanel title="Nobody has this course yet" action={assign ? <AssignCourseButton slug={member.companySlug} course={course.title} people={assign.people} teams={assign.teams} canEveryone={assign.canEveryone} label="Assign it to your first people" /> : undefined}>
          Assign it to a few people, a team or everyone. Their progress shows here as they learn: lesson by lesson, and their final assessment.
        </EmptyPanel>
      </>
    );
  }

  // ── Overview ──
  const funnel = courseFunnel(assigned, total, course.finalMark);
  const started = funnel[1].count;
  const completed = assigned.filter((p) => learnerStatus(p, total) === "completed").length;
  const finals = assigned.filter((p) => p.finalBest !== null);
  const finalAvg = finals.length ? Math.round(finals.reduce((s, p) => s + p.finalBest!, 0) / finals.length) : null;
  const passedFinal = funnel[4].count;
  const avgProgress = Math.round(assigned.reduce((s, p) => s + pct(p.lessonsPassed, total), 0) / assigned.length);
  const attention = assigned
    .map((p) => ({ p, why: attentionReason(p, total, now) }))
    .filter((x): x is { p: (typeof assigned)[number]; why: NonNullable<typeof x.why> } => !!x.why)
    .sort((a, b) => b.why.urgency - a.why.urgency);
  const checks = new Map(assigned.map((p) => [p.email, p.lessons]));
  const stats = lessonStats(course.lessons.map((l) => l.id), checks);
  const statOf = new Map(stats.map((s) => [s.lesson, s]));
  const hardest = hardestLessons(stats);
  // Only call out a drop-off when it's more than one person, so a single quiet learner isn't read as a trend.
  const fall = biggestDrop(stats);
  const drop = fall && fall.lost >= 2 ? fall : null;
  const lessonOf = new Map(course.lessons.map((l) => [l.id, l]));

  return (
    <>
      {head}
      <div className="flex flex-col gap-10">
        <dl className="grid gap-px overflow-hidden rounded-lg border border-line/30 bg-line/20 sm:grid-cols-2 xl:grid-cols-4">
          <Kpi label="Assigned" value={assigned.length} note={`${pct(started, assigned.length)}% have started`} />
          <Kpi label="Average progress" value={`${avgProgress}%`} note={`of ${total} lessons, across everyone assigned`} />
          <Kpi label="Completed every lesson" value={completed} note={completed ? `${pct(completed, assigned.length)}% of those assigned` : "Nobody yet"} />
          <Kpi label="Final assessment" value={finalAvg === null ? "—" : `${finalAvg}%`} note={finals.length ? `average best · ${passedFinal} passed (${course.finalMark}%+)` : "Nobody has taken it yet"} />
        </dl>

        <section aria-labelledby="funnel">
          <h2 id="funnel" className="text-xl font-bold">Learning funnel</h2>
          <p className="mt-1 text-sm text-muted">How far everyone assigned has got.</p>
          <ol className="mt-5 grid overflow-hidden rounded-lg border border-line/30 bg-white sm:grid-cols-2 xl:grid-cols-5">
            {funnel.map((s, i) => (
              <li key={s.label} className="border-b border-line/20 p-4 last:border-b-0 sm:[&:nth-child(odd)]:border-r xl:border-b-0 xl:border-r xl:last:border-r-0">
                <p className="text-sm font-medium">{s.label}</p>
                <p className="mt-1 text-3xl font-semibold tabular-nums">{s.count}</p>
                <div aria-hidden="true" className="mt-4 h-2 overflow-hidden rounded-full bg-paper"><span className="block h-full rounded-full bg-[#19a7c9]" style={{ width: `${pct(s.count, funnel[0].count)}%` }} /></div>
                <p className="mt-2 text-xs text-muted">{i === 0 ? "everyone with the course" : `${pct(s.count, funnel[0].count)}% of assigned`}</p>
              </li>
            ))}
          </ol>
        </section>

        <div className="grid gap-6 xl:grid-cols-2">
          <section aria-labelledby="attention" className="rounded-lg border border-line/30 bg-white">
            <div className="flex items-baseline justify-between gap-3 border-b border-line/25 px-5 py-4">
              <h2 id="attention" className="text-lg font-bold">Needs a nudge <span className="text-muted tabular-nums">({attention.length})</span></h2>
              {attention.length > 0 && <Link href={href("people")} className="text-sm font-semibold text-[#1f4fd1] hover:underline">See in People</Link>}
            </div>
            {attention.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-muted">Everyone is on track: nobody is overdue, slow to start or quiet for a week.</p>
            ) : (
              <ul>
                {attention.slice(0, 6).map(({ p, why }) => (
                  <li key={p.email} className="border-b border-line/15 last:border-0">
                    <Link href={href("people", `&person=${encodeURIComponent(p.email)}`)} className="flex items-center gap-3 px-5 py-3 hover:bg-paper">
                      <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink text-xs font-bold text-paper">{(p.name ?? p.email)[0]?.toUpperCase()}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">{p.name ?? p.email}</span>
                        <span className={clsx("block text-xs font-semibold", why.urgency >= 3 ? "text-error" : "text-[#6b3300]")}>{why.reason}</span>
                      </span>
                      <span className="shrink-0 text-xs tabular-nums text-muted">{p.lessonsPassed}/{total} lessons</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            {attention.length > 6 && <p className="border-t border-line/15 px-5 py-3 text-xs text-muted">And {attention.length - 6} more in People.</p>}
          </section>

          <section aria-labelledby="hardest" className="rounded-lg border border-line/30 bg-white">
            <div className="border-b border-line/25 px-5 py-4">
              <h2 id="hardest" className="text-lg font-bold">Hardest lessons</h2>
              <p className="mt-0.5 text-xs text-muted">Lowest average score on the lesson check, then most tries.</p>
            </div>
            {hardest.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-muted">Shows once at least two people have tried the same lesson.</p>
            ) : (
              <ol>
                {hardest.map((s, i) => {
                  const l = lessonOf.get(s.lesson)!;
                  return (
                    <li key={s.lesson} className="flex items-center gap-3 border-b border-line/15 px-5 py-3 last:border-0">
                      <span className="text-lg font-semibold tabular-nums text-muted">{i + 1}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">Lesson {l.no}: {l.title}</span>
                        <span className="block text-xs text-muted">{s.tried} tried · {s.passed} passed</span>
                      </span>
                      <span className="shrink-0 text-right text-sm tabular-nums"><strong>{s.avgScore}%</strong><span className="block text-xs text-muted">{s.avgAttempts} tries avg</span></span>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>
        </div>

        <section aria-labelledby="lessons">
          <h2 id="lessons" className="text-xl font-bold">Lesson by lesson</h2>
          <p className="mt-1 text-sm text-muted">
            How many of the {assigned.length} people assigned have passed each lesson.
            {drop && <> Most people stop after <strong>lesson {course.lessons[drop.from].no}</strong>: {drop.lost} fewer pass lesson {course.lessons[drop.to].no}.</>}
          </p>
          <div className="mt-5 flex flex-col gap-4">
            {course.modules.map((m) => (
              <div key={m.title} className="overflow-hidden rounded-lg border border-line/30 bg-white">
                <h3 className="bg-paper px-5 py-2.5 text-sm font-semibold">{m.title}</h3>
                <ol>
                  {m.lessons.map((l) => {
                    const s = statOf.get(l.id)!;
                    const isDrop = drop && course.lessons[drop.to].id === l.id;
                    return (
                      <li key={l.id} className={clsx("grid grid-cols-[1.5rem_minmax(0,1fr)_6rem_4.5rem] items-center gap-3 border-t border-line/15 px-5 py-2 text-sm sm:grid-cols-[2rem_minmax(0,1fr)_10rem_5.5rem]", isDrop && "bg-[#fdf1e7]")}>
                        <span className="tabular-nums text-muted">{l.no}</span>
                        <span className="truncate" title={l.title}>{l.title}</span>
                        <span className="flex items-center gap-2">
                          <span aria-hidden="true" className="h-2 flex-1 overflow-hidden rounded-full bg-paper"><span className="block h-full rounded-full bg-[#1f4fd1]" style={{ width: `${pct(s.passed, assigned.length)}%` }} /></span>
                          <span className="w-8 text-right text-xs tabular-nums text-muted">{s.passed}</span>
                        </span>
                        <span className="whitespace-nowrap text-right text-xs tabular-nums text-muted">{s.avgScore === null ? "—" : `${s.avgScore}% avg`}</span>
                      </li>
                    );
                  })}
                </ol>
              </div>
            ))}
          </div>
        </section>

        {assign && assign.history.length > 0 && <AssignmentHistory list={assign.history} />}
        <p className="border-t border-line/25 pt-4 text-sm text-muted">Only progress on courses your company assigned is shown. Personal course activity stays private.</p>
      </div>
    </>
  );
}

function Kpi({ label, value, note }: { label: string; value: React.ReactNode; note: string }) {
  return (
    <div className="bg-white p-5">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="mt-2 text-3xl font-semibold tabular-nums">{value}</dd>
      <dd className="mt-1 text-xs text-muted">{note}</dd>
    </div>
  );
}
