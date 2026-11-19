import clsx from "clsx";
import { Award, CalendarDays, CircleCheck, Flame, ListChecks, Zap, type LucideIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { LibraryCard } from "@/components/catalog/LibraryCard";
import { isListed, libraryCourses, type LibraryCourse, type MyCourse } from "@/data/course-cards";
import { challenges, publicPath, tracks } from "@/data/tracks";
import type { DashCourse } from "@/lib/learner/dashboard";

const arrow = <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><path d="M5 12h14M13 6l6 6-6 6" /></svg>;

/** The red button, for the one thing a card wants done. */
export const solid = "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-red px-4 text-sm font-bold text-white transition-colors hover:bg-red-press";
/** The quieter button, for looking rather than doing. */
export const outline = "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-ink/20 bg-card px-4 text-sm font-bold text-ink transition-colors hover:border-red-deep hover:text-red-deep";

/** A stage's heading: a two-part title, one line under it, and a link to the other stage. */
export function StageHeader({ title, accent, sub, aside }: { title: string; accent: string; sub: string; aside?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
      <div className="min-w-0 max-w-2xl">
        <h2 className="display text-[clamp(1.75rem,3vw,2.5rem)]">{title} <span className="text-red-deep">{accent}</span></h2>
        <p className="mt-2 hidden text-[15px] text-muted sm:block">{sub}</p>
      </div>
      {/* Phones switch stages from the bar at the top instead. */}
      <div className="hidden sm:block">{aside}</div>
    </div>
  );
}

function Bar({ done, total, label }: { done: number; total: number; label: string }) {
  const percent = total ? Math.min(100, Math.round((done / total) * 100)) : 0;
  return (
    <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={total} aria-valuenow={done} className="h-2 overflow-hidden rounded-full bg-ink/10">
      <div className="h-full rounded-full bg-red" style={{ width: `${Math.max(2, percent)}%` }} />
    </div>
  );
}

/** The featured course's next step, big, then every other course with its own. */
export function ContinueCard({ featured, others }: { featured: DashCourse; others: DashCourse[] }) {
  const c = featured;
  return (
    <section aria-labelledby="continue-title" className="card flex flex-col p-5 sm:p-7">
      <h3 id="continue-title" className="text-xs font-extrabold uppercase tracking-[0.16em] text-red-deep">{c.complete ? "Finished" : "Continue learning"}</h3>
      <p className="mt-4 text-sm font-semibold text-muted">
        <Link href={c.href} className="inline-block py-1 text-ink hover:text-red-deep">{c.title}</Link> · {c.kind}
      </p>
      <p className="display mt-1 text-[clamp(1.6rem,3.2vw,2.6rem)] text-balance">{c.next ?? c.title}</p>
      <div className="mt-5 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5">
        <Bar done={c.done} total={c.total} label={`${c.title}: ${c.done} of ${c.total} ${c.unit}`} />
        <span className="text-sm font-bold nums">{c.done}/{c.total}</span>
        <span className="col-span-2 text-xs text-muted">{c.unit.charAt(0).toUpperCase() + c.unit.slice(1)}</span>
      </div>
      {c.action && (
        <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2">
          <Link href={c.action.href} className="inline-flex min-h-12 items-center gap-2.5 rounded-lg bg-red px-5 text-[15px] font-bold text-white hover:bg-red-press">{c.action.label}{arrow}</Link>
          {c.note && <p className="text-sm font-semibold">{c.note}</p>}
        </div>
      )}

      {others.length > 0 && (
        <div className="mt-8 border-t border-ink/10 pt-5">
          <h3 className="text-xs font-extrabold uppercase tracking-[0.16em] text-muted">Also on the go</h3>
          <ul className="mt-2">
            {others.map((o) => (
              <li key={o.key} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 border-b border-ink/10 py-3.5 last:border-b-0">
                <div className="min-w-0">
                  <Link href={o.href} className="inline-block py-0.5 font-bold hover:text-red-deep">{o.title}</Link>
                  <p className="text-xs text-muted">{o.kind} · {o.done} of {o.total} {o.unit}{o.note ? ` · ${o.note}` : ""}</p>
                  <div className="mt-2 max-w-xs"><Bar done={o.done} total={o.total} label={`${o.title}: ${o.done} of ${o.total} ${o.unit}`} /></div>
                </div>
                {o.action && <Link href={o.action.href} className={outline}>{o.action.label}</Link>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

/** Before any course: one way in. */
export function FirstCourseCard({ email, contactEmail }: { email: string; contactEmail: string }) {
  return (
    <section aria-labelledby="continue-title" className="card flex flex-col p-5 sm:p-7">
      <h3 id="continue-title" className="text-xs font-extrabold uppercase tracking-[0.16em] text-red-deep">Start here</h3>
      <p className="display mt-4 text-[clamp(1.6rem,3.2vw,2.6rem)] text-balance">Pick your first course.</p>
      <p className="mt-2 max-w-md text-[15px] text-muted">The courses open now are below, and in the Library.</p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="#library" className="inline-flex min-h-12 items-center gap-2.5 rounded-lg bg-red px-5 text-[15px] font-bold text-white hover:bg-red-press">See the courses{arrow}</Link>
        <Link href="/dashboard/library" className={outline}>Open the Library</Link>
      </div>
      <p className="mt-6 max-w-md text-sm text-muted">
        Bought a course already? It belongs to the Google account you paid with, not <strong className="text-ink">{email}</strong>.
        Log out and sign in with that one, or write to <a href={`mailto:${contactEmail}`} className="underline underline-offset-2">{contactEmail}</a>.
      </p>
    </section>
  );
}

const LEVELS = ["bg-ink/[0.07]", "bg-[#f3c4c0]", "bg-[#df8a86]", "bg-[#b0373f]", "bg-red"];
const DAY_MS = 86_400_000;

/** Consecutive India-time days with progress, counting back from today (or from yesterday, while today is still open). */
function streakOf(days: Set<string>, today: string) {
  const back = (from: string) => { let n = 0, t = Date.parse(`${from}T00:00:00Z`); while (days.has(new Date(t).toISOString().slice(0, 10))) { n++; t -= DAY_MS; } return n; };
  const yesterday = new Date(Date.parse(`${today}T00:00:00Z`) - DAY_MS).toISOString().slice(0, 10);
  const current = days.has(today) ? back(today) : back(yesterday);
  let longest = 0, run = 0, prev = 0;
  for (const d of [...days].sort()) { const t = Date.parse(`${d}T00:00:00Z`); run = prev && t - prev === DAY_MS ? run + 1 : 1; longest = Math.max(longest, run); prev = t; }
  return { current, longest, today: days.has(today) };
}

/** Streak and the last twenty weeks of activity, across every course. */
export function ProgressCard({ activity, today }: { activity: Record<string, number>; /** India-time YYYY-MM-DD. */ today: string }) {
  const days = new Set(Object.keys(activity));
  const st = streakOf(days, today);
  // Twenty weeks, Monday first, ending with this week.
  const t0 = Date.parse(`${today}T00:00:00Z`);
  const monday = t0 - ((new Date(t0).getUTCDay() + 6) % 7) * DAY_MS;
  const start = monday - 19 * 7 * DAY_MS;
  const weeks = Array.from({ length: 20 }, (_, w) => Array.from({ length: 7 }, (_, d) => {
    const t = start + (w * 7 + d) * DAY_MS;
    const key = new Date(t).toISOString().slice(0, 10);
    const n = activity[key] ?? 0;
    return { key, future: t > t0, today: t === t0, level: n === 0 ? 0 : Math.min(4, n) };
  }));
  const active = weeks.flat().filter((c) => c.level > 0).length;
  const months = weeks.map((w, i) => ({ i, m: new Date(Date.parse(`${w[0].key}T00:00:00Z`)).toLocaleString("en-IN", { month: "short", timeZone: "UTC" }) }))
    .filter((x, i, a) => i === 0 || x.m !== a[i - 1].m);

  return (
    <section aria-labelledby="streak-title" className="card flex flex-col gap-6 p-5 sm:p-7">
      <div className="flex items-start gap-4">
        <span aria-hidden="true" className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-red-tint text-red-deep"><Flame className="size-7" strokeWidth={1.9} /></span>
        <div>
          <h3 id="streak-title" className="text-sm font-bold text-muted">Your streak</h3>
          <p className="display mt-1 text-[2.5rem] leading-none nums">{st.current} {st.current === 1 ? "day" : "days"}</p>
          <p className="mt-2 text-sm text-muted">{st.current ? (st.today ? "Today counts." : "Finish a step today to keep it.") : "Finish a step in any course to start one."} Longest: {st.longest}.</p>
        </div>
      </div>
      <div>
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="text-sm font-bold">Activity</h3>
          <span className="text-xs text-muted nums">{active} active {active === 1 ? "day" : "days"} in 20 weeks</span>
        </div>
        <div className="mt-3 overflow-x-auto pb-1">
          <div role="img" aria-label={`Activity calendar: ${active} active days in the last 20 weeks, every course counted`} className="inline-flex flex-col gap-1.5">
            <div aria-hidden="true" className="relative ml-8 h-4">
              {months.map((x) => <span key={x.i} className="absolute top-0 text-[11px] font-semibold text-muted" style={{ left: x.i * 16 }}>{x.m}</span>)}
            </div>
            <div aria-hidden="true" className="flex gap-2">
              <div className="grid w-6 grid-rows-7 gap-[3px] text-[10px] leading-[13px] text-muted"><span>Mon</span><span /><span>Wed</span><span /><span>Fri</span><span /><span /></div>
              <div className="flex gap-[3px]">
                {weeks.map((w, i) => (
                  <div key={i} className="flex flex-col gap-[3px]">
                    {w.map((c) => <span key={c.key} className={clsx("size-[13px] rounded-[3px]", c.future ? "border border-dashed border-ink/15" : LEVELS[c.level], c.today && "ring-2 ring-ink ring-offset-1")} />)}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div aria-hidden="true" className="mt-3 flex items-center gap-1 text-xs text-muted">
          <span className="mr-1">Less</span>{LEVELS.map((l) => <span key={l} className={clsx("size-[13px] rounded-[3px]", l)} />)}<span className="ml-1">More</span>
        </div>
      </div>
    </section>
  );
}

/** One row of library cards: sideways on phones, as on the main platform; the library's grid from 640px. */
function CardRow({ id, title, sub, items }: { id: string; title: string; sub: string; items: { course: LibraryCourse; mine?: MyCourse }[] }) {
  return (
    <section aria-labelledby={id}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h3 id={id} className="text-lg font-extrabold">{title}</h3>
        <p className="text-sm text-muted">{sub}</p>
      </div>
      <ul className="-mx-4 mt-3 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pt-1 pb-3 sm:mx-0 sm:grid sm:snap-none sm:gap-6 sm:overflow-visible sm:px-0 sm:pb-0 sm:[grid-template-columns:repeat(auto-fill,minmax(max(260px,calc((100%-48px)/3)),1fr))]">
        {items.map(({ course, mine }) => (
          <li key={course.slug} className="w-[82%] max-w-[20rem] shrink-0 snap-start sm:w-auto sm:max-w-none">
            <LibraryCard course={course} mine={mine} />
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Initials for a card's art: "Data Science" → "DS". */
const initials = (name: string) => name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();

/** A 60-day challenge the library doesn't list yet, as a library card. */
const challengeCard = (t: (typeof challenges)[number]): LibraryCourse => ({
  slug: t.slug, name: t.name, kind: "60-day challenge", summary: t.description, category: "Challenge", glyph: initials(t.name), tint: "clay",
  roles: [], industries: ["any-industry"], open: true, free: true, href: publicPath(t), card: null,
});

/** DSA practice, not built yet: a card that says so. */
const DSA: LibraryCourse = {
  slug: "dsa-arrays", name: "Array and String Mastery", kind: "DSA practice", summary: "Two problems a day for fifteen days: arrays and strings, from basics to interview level.",
  category: "DSA practice", glyph: "{ }", tint: "slate", roles: [], industries: ["any-industry"], open: true, free: false, href: null, card: null,
};

/**
 * More to start, in the library's own cards: the challenges and courses, the
 * career tracks, and DSA practice. Courses already joined say Enrolled, open
 * at their next step, and come last in their row: the rows are for something new.
 *
 * Only the courses this build lists (isListed: every course in development,
 * the live ones on the site), and a row left with none is not shown.
 */
export function LibraryRows({ mine }: { mine: Record<string, MyCourse> }) {
  const card = (slug: string) => libraryCourses.find((c) => c.slug === slug);
  const order = (a: { mine?: MyCourse }, b: { mine?: MyCourse }) => Number(!!a.mine) - Number(!!b.mine);
  const row = (courses: (LibraryCourse | undefined)[]) =>
    courses.filter((c): c is LibraryCourse => !!c && isListed(c.slug)).map((course) => ({ course, mine: mine[course.slug] })).sort(order);
  const first = row([...challenges.map((t) => card(t.slug) ?? challengeCard(t)), ...["agentic-ai", "system-design", "ai-cohort"].map(card)]);
  const careers = row(tracks.map((t) => card(t.slug)));
  const dsa = row([DSA]);
  // Named for what is in it: with no challenge listed yet, it is just the courses.
  const withChallenges = first.some((i) => i.course.kind === "60-day challenge");
  return (
    <div id="library" className="flex scroll-mt-24 flex-col gap-10">
      {first.length > 0 && (
        withChallenges
          ? <CardRow id="row-courses" title="Challenges and courses" sub="Build with AI, one task a day, or at your own pace." items={first} />
          : <CardRow id="row-courses" title="Courses" sub="Start any day." items={first} />
      )}
      {careers.length > 0 && <CardRow id="row-tracks" title="Career tracks" sub="Thirty days of real work for the role you want next." items={careers} />}
      {dsa.length > 0 && <CardRow id="row-dsa" title="Practice DSA" sub="Two coding problems a day." items={dsa} />}
    </div>
  );
}

/** One of the Test skills cards: a kicker with its mark, what it is, where the learner stands, and one button. */
export function MilestoneCard({ icon: Icon, kicker, title, status, cta, done }: { icon: LucideIcon; kicker: string; title: string; status: string; cta: { label: string; href: string; solid: boolean } | null; done: boolean }) {
  return (
    <article className="card flex flex-col gap-3 p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2.5 text-xs font-extrabold uppercase tracking-[0.14em] text-muted">
          <span aria-hidden="true" className="flex size-9 items-center justify-center rounded-xl bg-red-tint text-red-deep"><Icon className="size-[18px]" strokeWidth={2} /></span>
          {kicker}
        </span>
        {done && <span className="flex items-center gap-1 text-xs font-bold text-red-deep"><CircleCheck aria-hidden="true" className="size-4" />Done</span>}
      </div>
      <h3 className="text-lg font-extrabold leading-snug">{title}</h3>
      <p className="text-sm text-muted">{status}</p>
      {cta && <Link href={cta.href} className={clsx("mt-auto self-start", cta.solid ? solid : outline)}>{cta.label}</Link>}
    </article>
  );
}

export const MILESTONE_ICONS = { quiz: ListChecks, webinar: CalendarDays, hackathon: Zap, badge: Award };

/** Questions and answers under a stage, each opening in place. */
export function Faq({ id, items }: { id: string; items: [string, string][] }) {
  return (
    <section aria-labelledby={id} className="card p-5 sm:p-7">
      <h3 id={id} className="text-lg font-extrabold">Questions</h3>
      <div className="mt-2">
        {items.map(([q, a]) => (
          <details key={q} className="group border-b border-ink/10 last:border-b-0">
            <summary className="flex min-h-13 cursor-pointer list-none items-center justify-between gap-4 py-3 font-semibold [&::-webkit-details-marker]:hidden">
              {q}
              <span aria-hidden="true" className="text-xl leading-none transition-transform group-open:rotate-45">+</span>
            </summary>
            <p className="max-w-2xl pb-4 text-[15px] text-muted">{a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
