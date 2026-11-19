import "server-only";
import { MODULES } from "@/data/system-design/course-app";
import { COURSES } from "@/data/courses/registry";
import type { MyCourse } from "@/data/course-cards";
import { getCurriculum } from "@/data/curricula";
import { getTrack } from "@/data/tracks";
import { trackMilestones, SD_BADGES, type CourseBadge, type MedalIcon } from "@/lib/achievements";
import { hasCourseAccess, lessonPasses } from "@/lib/access";
import { ALL_IDS, LESSON_COUNT, badges, serverState } from "@/lib/course-app";
import { db } from "@/lib/db/client";
import { dayActionLabel, nextDayFor } from "@/lib/day-lock";
import { SD_COURSE } from "@/lib/sd-offer";
import { istDay, paceOf, type SdProgress } from "@/lib/sd-pace";
import { bestQuizScores } from "@/lib/challenge-quiz";
import { hasInterest } from "@/lib/hackathon";
import { WEBINAR } from "@/lib/webinar";
import { sdProgress } from "@/lib/sd-progress";
import type { Learner, Submission } from "@/lib/learner/data";

/** Postgres: no such table. */
const UNDEFINED_TABLE = "42P01";

/** One course on the dashboard: how far, and the one specific thing to do next. */
export interface DashCourse {
  /** Matches CourseBadge.course, so a badge can name its course. */
  key: string;
  title: string;
  /** What kind of course, in a few words: "60-day challenge", "Course · 21 days". */
  kind: string;
  /** The course's own home, for opening it without the next step. */
  href: string;
  done: number;
  total: number;
  /** What `done` counts: "days submitted", "lessons passed", "modules done". */
  unit: string;
  /** The next step, said specifically ("Continue Day 13"), or null when there is nothing to do today. */
  action: { label: string; href: string } | null;
  /** What the next step is about, e.g. the lesson's title. */
  next: string | null;
  /** The one line a learner needs before acting, e.g. a deadline. */
  note: string | null;
  /** When the learner last made progress here, for choosing the course to feature. */
  lastActive: string | null;
  /** There is a step to take today (not waiting for midnight or a release). */
  ready: boolean;
  /** Today is the last day for that step: it leads the dashboard. */
  due: boolean;
  complete: boolean;
}

/** The library card a dashboard course belongs to: track and challenge slugs, System Design, a self-paced course. */
export const librarySlug = (key: string) => key.replace(/^(track|course):/, "");

/** The learner's courses as the library cards show them, by library slug: the next step, and how far they are. */
export function myLibraryCourses(courses: DashCourse[]): Record<string, MyCourse> {
  return Object.fromEntries(courses.map((c) => [librarySlug(c.key), {
    title: c.title,
    href: c.action?.href ?? c.href,
    label: c.action?.label ?? "Open",
    progress: `${c.done} of ${c.total} ${c.unit}`,
  }]));
}

const latest = (times: (string | null | undefined)[]) => times.filter((t): t is string => !!t).sort().at(-1) ?? null;
const iso = (t: string) => new Date(t).toISOString();

const SD_TITLE = "System Design";
const SD_HREF = "/learn/system-design";
const sdLink = (id: string) => `${SD_HREF}?lesson=${id}`;
const sdTitle = (id: string) => {
  const [mi, li] = id.split("-").map(Number);
  return MODULES[mi]?.lessons[li]?.[0] ?? null;
};

/** System Design: the next lesson from the pace rules the course itself uses, so the two never disagree. */
function systemDesignCourse(progress: SdProgress | null): DashCourse {
  const passes = progress?.passes ?? [];
  const pace = progress ? paceOf(progress) : null;
  const base: DashCourse = {
    key: SD_COURSE, title: SD_TITLE, kind: `Course · ${LESSON_COUNT} days`, href: SD_HREF,
    done: Math.min(passes.length, LESSON_COUNT), total: LESSON_COUNT, unit: "lessons passed",
    action: null, next: null, note: null, lastActive: latest(passes.map((p) => p.at)), ready: false, due: false, complete: false,
  };
  if (!pace) return { ...base, action: { label: "Open the course", href: SD_HREF }, ready: true };
  const day = pace.day;
  switch (pace.state) {
    case "start":
      return { ...base, action: { label: "Start Day 1", href: sdLink(pace.lesson!) }, next: sdTitle(pace.lesson!), ready: true };
    case "open":
      return {
        ...base,
        action: { label: `Continue Day ${day}`, href: sdLink(pace.lesson!) },
        next: sdTitle(pace.lesson!),
        note: pace.dueOn === pace.today ? "Due by midnight, India time." : null,
        ready: true,
        due: pace.dueOn === pace.today,
      };
    case "done":
      return pace.lesson
        ? { ...base, next: sdTitle(pace.lesson), note: `Day ${day} opens at midnight, India time.`, action: { label: "Open System Design", href: SD_HREF } }
        : { ...base, note: "The final assessment opens at midnight, India time.", action: { label: "Open System Design", href: SD_HREF } };
    case "waiting":
      return { ...base, next: pace.lesson ? sdTitle(pace.lesson) : null, note: `Day ${day} isn’t out yet.`, action: { label: "Open System Design", href: SD_HREF } };
    case "final":
      return { ...base, next: "Final assessment", note: pace.finalsLeft ? `${pace.finalsLeft} ${pace.finalsLeft === 1 ? "try" : "tries"} left that count.` : null, action: { label: "Take the final", href: SD_HREF }, ready: true };
    case "finished":
      return { ...base, complete: true, action: { label: "Review the course", href: SD_HREF } };
  }
}

/** A track or challenge: the next day to submit. */
function trackCourse(learner: Learner, submissions: Submission[]): DashCourse {
  const track = getTrack(learner.track)!;
  const challenge = track.kind === "challenge";
  const curriculum = track.contentLive ? getCurriculum(learner.track) : null;
  const total = curriculum?.days.length ?? (challenge ? 60 : 30);
  const days = new Set(submissions.map((s) => s.day));
  const home = `/learn/tracks/${learner.track}`;
  const base: DashCourse = {
    key: `track:${learner.track}`, title: track.name, kind: challenge ? `${total}-day challenge` : `Career track · ${total} days`, href: home,
    done: days.size, total, unit: "days submitted", action: null, next: null, note: null,
    lastActive: latest(submissions.map((s) => s.submitted_at)), ready: false, due: false, complete: false,
  };
  if (!curriculum) return { ...base, note: "Day 1 opens soon.", action: { label: challenge ? "Open challenge" : "Open track", href: home } };
  const next = nextDayFor(days, total);
  if (!next) return { ...base, complete: true, action: { label: challenge ? "Review the challenge" : "Review the track", href: home } };
  return {
    ...base,
    action: { label: dayActionLabel(next, false), href: `${home}/day/${next}` },
    next: curriculum.days.find((d) => d.day === next)?.title ?? null,
    ready: true,
  };
}

/** A self-paced course someone has opened: the next module not marked done. */
function readingCourse(slug: string, rows: { module: string; done_at: string | null }[]): DashCourse | null {
  const course = COURSES.find((c) => c.slug === slug);
  if (!course) return null;
  const done = new Set(rows.filter((r) => r.done_at).map((r) => r.module));
  const count = course.modules.filter((m) => done.has(m.slug)).length;
  const next = course.modules.find((m) => !done.has(m.slug));
  return {
    key: `course:${slug}`, title: course.title, kind: `Course · ${course.modules.length} modules`, href: `/courses/${slug}`,
    done: count, total: course.modules.length, unit: "modules done",
    action: next
      ? { label: count ? `Continue Module ${next.number}` : "Start Module 1", href: `/learn/courses/${slug}/${next.slug}` }
      : { label: "Review the course", href: `/courses/${slug}` },
    next: next?.title ?? null, note: null,
    lastActive: latest(rows.map((r) => r.done_at)), ready: !!next, due: false, complete: !next,
  };
}

/** Every self-paced course row this person has, with when each module was marked done. */
async function readingRows(email: string) {
  const sql = db();
  if (!sql) return {};
  const { data, error } = await sql.rows<{ course: string; module: string; done_at: string | null }>`
    select course, module, done_at from course.course_progress where email = ${email}
  `;
  if (error && error.code !== UNDEFINED_TABLE) console.error("course progress read failed:", error.code);
  const out: Record<string, { module: string; done_at: string | null }[]> = {};
  for (const r of data ?? []) (out[r.course] ??= []).push({ module: r.module, done_at: r.done_at ? iso(r.done_at) : null });
  return out;
}

/**
 * System Design's badges as the server can vouch for them, by the course's own `badges()` rules,
 * each with the time of the pass that earned it. "Note taker" and "Builder" live only in a browser:
 * the dashboard adds them there (see SdBadgeMerge), undated.
 */
function systemDesignBadges(progress: SdProgress | null, scores: Record<string, number>): CourseBadge[] {
  const passes = [...(progress?.passes ?? [])].filter((p) => ALL_IDS.includes(p.lesson)).sort((a, b) => a.at.localeCompare(b.at));
  const at = new Map<string, string>();
  for (let k = 1; k <= passes.length; k++) {
    const prefix = passes.slice(0, k);
    const state = serverState(Object.fromEntries(prefix.map((p) => [p.lesson, scores[p.lesson] ?? 0])), progress && { ...progress, passes: prefix });
    for (const b of badges(state)) if (b.on && !at.has(b.name)) at.set(b.name, prefix[k - 1].at);
  }
  const now = badges(serverState(scores, progress));
  const passed = passes.length;
  return now.map((b) => ({
    key: `${SD_COURSE}:${b.name}`, name: b.name, description: b.description,
    family: SD_BADGES[b.name]?.family ?? "learn", icon: b.icon as MedalIcon,
    course: SD_COURSE, courseHref: `${SD_HREF}?view=progress`,
    earned: b.on, earnedAt: b.on ? at.get(b.name) ?? null : null,
    hint: SD_BADGES[b.name]?.hint ?? "",
    toward: b.name === "First lesson" || b.name === "First pass" ? { done: Math.min(passed, 1), of: 1 }
      : b.name === "Course complete" ? { done: passed, of: LESSON_COUNT } : null,
  }));
}

/** A track's four milestones, each dated by the submission that reached it. */
function trackBadges(learner: Learner, submissions: Submission[], total: number): CourseBadge[] {
  // The time each new day was first submitted, in order: the nth entry is when the count reached n.
  const firsts = new Map<number, string>();
  for (const s of [...submissions].sort((a, b) => a.submitted_at.localeCompare(b.submitted_at))) if (!firsts.has(s.day)) firsts.set(s.day, iso(s.submitted_at));
  const reached = [...firsts.values()];
  return trackMilestones(total).map((m) => ({
    key: `track:${learner.track}:${m.name}`, name: m.name, description: m.description, family: m.family, icon: m.icon,
    course: `track:${learner.track}`, courseHref: `/learn/tracks/${learner.track}#achievements-title`,
    earned: reached.length >= m.days, earnedAt: reached[m.days - 1] ?? null,
    hint: m.hint, toward: { done: Math.min(reached.length, m.days), of: m.days },
  }));
}

export interface WeeklyQuizStatus {
  /** The challenge it belongs to. */
  title: string;
  week: number;
  /** Where the quiz lives: the last day of its week. */
  href: string;
  /** Best try so far, or null when not taken. */
  best: { score: number; total: number } | null;
  /** The week's days are all in, so it can be taken now. */
  ready: boolean;
}

export interface Dashboard {
  courses: DashCourse[];
  /** The course to lead with, or null when there is none. */
  featured: DashCourse | null;
  badges: CourseBadge[];
  /** Course titles by key, for naming a badge's course. */
  titles: Record<string, string>;
  /** System Design's server record, for adding the badges only a browser knows. Null without a seat. */
  sd: { passes: Record<string, number>; progress: SdProgress | null } | null;
  /** Finished steps per India-time day (YYYY-MM-DD), across every course. */
  activity: Record<string, number>;
  /** The weekly quiz to take or that was last taken, on the learner's most advanced challenge. Null without a challenge. */
  quiz: WeeklyQuizStatus | null;
  /** Signed up for the current live webinar. */
  webinarRegistered: boolean;
  /** Asked to hear when hackathon registration opens. */
  hackathonInterest: boolean;
  /** When this was read: the India-time day, and the minute of that day (for the sky). */
  today: string;
  minute: number;
}

/** A challenge's weekly quiz: the latest week whose days are all submitted, or week 1 before that. */
async function weeklyQuiz(places: { learner: Learner; submissions: Submission[] }[]): Promise<WeeklyQuizStatus | null> {
  const challenges = places.filter((p) => getTrack(p.learner.track)?.kind === "challenge");
  if (!challenges.length) return null;
  // The challenge furthest along carries the quiz worth showing.
  const { learner, submissions } = challenges.sort((a, b) => b.submissions.length - a.submissions.length)[0];
  const curriculum = getCurriculum(learner.track);
  if (!curriculum) return null;
  const done = new Set(submissions.map((s) => s.day));
  const weeks = [...new Set(curriculum.days.map((d) => d.week))].sort((a, b) => a - b);
  const lastOf = (w: number) => Math.max(...curriculum.days.filter((d) => d.week === w).map((d) => d.day));
  const complete = weeks.filter((w) => curriculum.days.filter((d) => d.week === w).every((d) => done.has(d.day)));
  const week = complete.at(-1) ?? weeks[0];
  const scores = await bestQuizScores(learner.id);
  return {
    title: getTrack(learner.track)!.name, week,
    href: `/learn/tracks/${learner.track}/day/${lastOf(week)}`,
    best: scores[week] ?? null, ready: complete.includes(week),
  };
}

async function webinarSignedUp(email: string) {
  const sql = db();
  if (!sql) return false;
  const { data, error } = await sql.row<{ id: string }>`
    select id from course.webinar_registrations where webinar = ${WEBINAR.slug} and email = ${email}
  `;
  if (error && error.code !== UNDEFINED_TABLE) console.error("webinar registration read failed:", error.code);
  return !!data;
}

/** Finished steps per day, in India time: lessons passed, days submitted, modules marked done, quizzes taken. */
async function activityByDay(places: { learner: Learner; submissions: Submission[] }[], progress: SdProgress | null, reading: Record<string, { done_at: string | null }[]>) {
  const sql = db();
  const ids = places.map((p) => p.learner.id);
  const quizzes = sql && ids.length
    ? (await sql.rows<{ taken_at: string }>`select taken_at from course.challenge_quiz_attempts where learner_id = any(${ids}::uuid[])`).data ?? []
    : [];
  const times = [
    ...(progress?.passes ?? []).map((p) => p.at),
    ...places.flatMap((p) => p.submissions.map((s) => s.submitted_at)),
    ...Object.values(reading).flat().map((r) => r.done_at),
    ...quizzes.map((q) => q.taken_at),
  ].filter((t): t is string => !!t);
  const out: Record<string, number> = {};
  for (const t of times) { const d = istDay(t); out[d] = (out[d] ?? 0) + 1; }
  return out;
}

/**
 * The learner's whole picture: every course with its next step, the one to lead
 * with, every badge, the days they were active, and the week's quiz, webinar and
 * hackathon. The featured course is the one due today, then the one with
 * something to do now that they touched most recently, then any unfinished one.
 */
export async function loadDashboard(email: string, places: { learner: Learner; submissions: Submission[] }[]): Promise<Dashboard> {
  const enrolled = await hasCourseAccess(email, SD_COURSE);
  const [progress, scores, reading, quiz, webinarRegistered, hackathonInterest] = await Promise.all([
    enrolled ? sdProgress(email) : Promise.resolve(null),
    enrolled ? lessonPasses(email, SD_COURSE) : Promise.resolve({} as Record<string, number>),
    readingRows(email),
    weeklyQuiz(places),
    webinarSignedUp(email),
    hasInterest(email),
  ]);

  const courses: DashCourse[] = [];
  const list: CourseBadge[] = [];
  for (const { learner, submissions } of places) {
    const c = trackCourse(learner, submissions);
    courses.push(c);
    list.push(...trackBadges(learner, submissions, c.total));
  }
  if (enrolled) {
    courses.push(systemDesignCourse(progress));
    list.push(...systemDesignBadges(progress, scores));
  }
  for (const slug of Object.keys(reading)) {
    const c = readingCourse(slug, reading[slug]);
    if (c) courses.push(c);
  }

  // Due today first; then doable now beats waiting; then the most recent activity; a course never touched comes after one that was.
  const ranked = [...courses].sort((a, b) =>
    Number(b.due) - Number(a.due) || Number(b.ready) - Number(a.ready) || (b.lastActive ?? "").localeCompare(a.lastActive ?? "") || Number(a.complete) - Number(b.complete));
  const featured = ranked[0] ?? null;

  return {
    courses: featured ? [featured, ...courses.filter((c) => c !== featured)] : courses,
    featured,
    badges: list,
    titles: Object.fromEntries(courses.map((c) => [c.key, c.title])),
    sd: enrolled ? { passes: scores, progress } : null,
    activity: await activityByDay(places, progress, reading),
    quiz,
    webinarRegistered,
    hackathonInterest,
    today: istDay(Date.now()),
    minute: istNowMinute(),
  };
}

/** The minute of the day it is in India. */
const istNowMinute = (now = new Date()) => (now.getUTCHours() * 60 + now.getUTCMinutes() + 330) % 1440;
