"use client";

import clsx from "clsx";
import Link from "next/link";
import { MODULES } from "@/data/system-design/course-app";
import {
  ALL_IDS, LESSON_COUNT, PASS_MARK, checkAverage, checkScores, dayOf, fmt, isSoon, lesson, lessonDay, moduleIds, moduleMinutes, openFinal, openLesson, pad, paceNow, pct, type CourseState,
} from "@/lib/course-app";
import { paceMessage, type Pace } from "@/lib/sd-pace";
import { GroupCard, useExtraUnread } from "../Community";
import { Icon } from "../icons";
import { OverviewVideo } from "../Overlays";
import { ReferralStrip, useReferral } from "../Referral";
import { ReminderPrompt } from "../SdReminders";
import { Bar, Duration, LessonMark, lessonView, parallax, stagger } from "../ui";
import { GoogleButton, useCourseUser } from "../user";
import type { Act } from "../useCourseApp";

/** Per-module progress, shared with the Progress screen. */
export function moduleViews(s: CourseState) {
  return MODULES.map((m, mi) => {
    const ids = moduleIds(mi);
    const n = ids.filter((id) => s.done.includes(id)).length;
    const out = ids.filter((id) => !isSoon(id)).length;
    const count = `${ids.length} ${ids.length === 1 ? "lesson" : "lessons"}`;
    const meta = out === ids.length ? `${count} · ${moduleMinutes(mi)} min` : out ? `${out} of ${ids.length} out now · more coming` : `${count} · coming soon`;
    return { mi, num: pad(mi + 1), title: m.title, meta, n, total: ids.length, complete: n === ids.length, ids };
  });
}

/** The next lesson still to finish, which is what "Lesson checks" opens. */
export function firstOpenLesson(s: CourseState) {
  return ALL_IDS.find((id) => !s.done.includes(id) && !isSoon(id)) ?? ALL_IDS[0];
}

export function BellButton({ s, act, className }: { s: CourseState; act: Act; className?: string }) {
  const unread = s.notifs.filter((n) => n.unread).length + useExtraUnread(s);
  return (
    <button
      type="button"
      onClick={() => act((p) => ({ ...p, screen: "notifs", tab: "course" }))}
      aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
      className={clsx("relative flex size-11 flex-none cursor-pointer items-center justify-center rounded-lg border border-sd-divider bg-transparent text-sd-ink hover:bg-sd-accent-100", className)}
    >
      <Icon name="bell" size={16} />
      {unread > 0 && <span className="absolute -top-[7px] -right-[7px] h-[18px] min-w-[18px] rounded-full bg-sd-accent px-1 text-left text-[10px] leading-[18px] font-extrabold text-sd-bg">{unread}</span>}
    </button>
  );
}

/** Where the learner stands today: one clear line on the day, the streak and the refund. */
function PaceCard({ pace }: { pace: Pace }) {
  const { title, body, tone } = paceMessage(pace);
  return (
    <div role="status" className={clsx("sd-a-in flex flex-col gap-1 rounded-xl border-2 px-4 py-3.5", tone === "warn" ? "border-sd-accent bg-sd-accent-100" : "border-sd-divider")} style={{ animationDuration: ".5s", animationDelay: "40ms" }}>
      <span className="text-[17px] font-extrabold tracking-[-0.01em]">{title}</span>
      <span className="text-sm text-pretty text-sd-n-800">
        {body}
        {pace.refund === "earned" && pace.refundable && <> <Link href="/refund-policy" className="underline underline-offset-2">How to claim</Link></>}
      </span>
    </div>
  );
}

function AssessmentRow({ kind, s, act }: { kind: "lessons" | "final"; s: CourseState; act: Act }) {
  const lessons = kind === "lessons";
  const scored = checkScores(s);
  const go = () => act((p) => (lessons ? openLesson(p, firstOpenLesson(p)) : openFinal(p)));
  const sub = lessons
    ? `${scored.filter((x) => x.passed).length} passed · ${Math.round(PASS_MARK * 100)}% to pass`
    : s.post ? `Done · ${pct(s.post)}` : "6 questions across the course · after Day 21";
  return (
    <button type="button" onClick={go} className="flex min-h-14 cursor-pointer items-center gap-3 rounded-lg bg-sd-surface p-3.5 text-left hover:bg-sd-n-300">
      <span className={clsx("flex size-9 flex-none items-center justify-center rounded-lg text-sd-bg", lessons ? "bg-sd-ink" : "bg-sd-accent")}><Icon name={lessons ? "target" : "trending"} /></span>
      <span className="flex flex-1 flex-col">
        <span className="text-[15px] font-extrabold">{lessons ? "Lesson checks" : "Final assessment"}</span>
        <span className="text-xs text-sd-n-700">{sub}</span>
      </span>
      {lessons ? <span className="sd-tag sd-tag-neutral rounded-md">{checkAverage(s)} avg</span> : <span className="flex text-sd-n-600"><Icon name="chevR" size={16} /></span>}
    </button>
  );
}

/**
 * The course page, and where the course opens: the lesson to do now (one tap
 * into it), where the learner stands on today's deadline, then the syllabus
 * with every lesson, the checks and the final. There is no separate course
 * dashboard: the Klymb.ai dashboard lists every course, and this page is the course.
 */
export function Course({ s, act }: { s: CourseState; act: Act }) {
  const user = useCourseUser();
  const referral = useReferral();
  const pace = paceNow(s);
  const doneCount = s.done.length;
  const coursePct = Math.round((doneCount / LESSON_COUNT) * 100);
  const mods = moduleViews(s);

  // Today's lesson once it's open, wherever this device last left off.
  const heroId = pace?.lesson && (pace.state === "start" || pace.state === "open") ? pace.lesson : s.cur;
  const heroT = heroId === s.cur ? s.t : 0;
  const c = lesson(heroId);
  const minutes = dayOf(heroId)?.minutes;
  const heroVerb = `${pace?.passed.includes(heroId) ? "Revisit" : heroId === s.cur && (doneCount || s.t) ? "Continue" : "Start"} ${lessonDay(heroId)}`;

  return (
    <div className="sd-a-screen flex w-full max-w-[1120px] flex-col gap-[22px] px-5 pt-2 pb-7 lg:gap-7 lg:px-0 lg:pt-0 lg:pb-0">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 lg:border-b-2 lg:border-sd-divider lg:pb-4">
        <h2 className="m-0 text-[30px] leading-[1.05] tracking-[-0.02em] lg:text-[42px] lg:tracking-[-0.03em]">System Design</h2>
        <span className="text-[13px] font-semibold text-sd-n-700 lg:text-sm">{doneCount} of {LESSON_COUNT} lessons · {coursePct}%</span>
      </div>

      {pace && <PaceCard pace={pace} />}

      <button
        type="button"
        onClick={() => act((p) => openLesson(p, heroId))}
        {...parallax}
        aria-label={`${heroVerb}: ${c.title}`}
        className="sd-grid sd-a-in relative flex min-h-[300px] w-full cursor-pointer flex-col justify-between gap-7 overflow-hidden rounded-2xl p-[22px] text-left text-sd-bg lg:min-h-[340px] lg:p-10"
        style={{ animationDuration: ".6s", animationDelay: "50ms" }}
      >
        <div className="sd-mid flex flex-col gap-3.5">
          <span className="text-xs font-extrabold tracking-[0.12em] text-sd-accent-400 uppercase">{lessonDay(heroId)} · Module {String(c.mi + 1).padStart(2, "0")}{minutes ? ` · ${minutes} min` : ""}</span>
          <span className="sd-near max-w-[760px] text-[40px] leading-[.98] font-extrabold tracking-[-0.035em] text-balance lg:text-[64px]">{c.title}</span>
        </div>
        <div className="flex flex-col items-stretch gap-4 lg:flex-row lg:items-end">
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <div className="flex justify-between gap-3 text-[13px] text-sd-n-300">
              <span className="min-w-0 truncate">{c.m.title}</span>
              <span className="flex-none font-bold whitespace-nowrap text-sd-bg">{fmt(heroT)} / {c.dur}</span>
            </div>
            <div className="h-1 overflow-hidden rounded-full bg-white/18">
              <div className="h-full rounded-full bg-sd-accent-400 transition-[width] duration-600" style={{ width: `${Math.min(100, (heroT / c.secs) * 100)}%` }} />
            </div>
          </div>
          <span className="flex h-[52px] w-full flex-none items-center justify-between gap-4 rounded-[10px] bg-sd-accent-400 px-[18px] text-base font-extrabold text-sd-ink lg:w-[240px]">
            {heroVerb}
            <span className="flex"><Icon name="play" size={20} /></span>
          </span>
        </div>
      </button>

      {!user && s.done.length > 0 && (
        <div className="w-full sm:w-[280px]"><GoogleButton lesson={s.cur} where="course" label="Save progress with Google" className="h-11 border-2 border-sd-ink" /></div>
      )}
      <GroupCard s={s} act={act} />
      {referral?.state === "open" && <ReferralStrip r={referral} act={act} />}
      {user && dayOf(s.cur) && <ReminderPrompt />}

      <div className="flex flex-col gap-[18px] border-t-2 border-sd-divider pt-5 lg:grid lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start lg:gap-10 lg:pt-6">
        <section aria-labelledby="sd-syllabus" className="order-2 lg:order-none">
          <h3 id="sd-syllabus" className="sd-h6 mb-2">{LESSON_COUNT} lessons · {MODULES.length} modules</h3>
          <div className="border-t-2 border-sd-divider">
            {mods.map((m) => {
              const open = s.openMod === m.mi;
              return (
                <div key={m.mi} className="sd-a-in border-b border-sd-divider" style={stagger(m.mi, 40, 120)}>
                  <button
                    type="button"
                    aria-expanded={open}
                    onClick={() => act((p) => ({ ...p, openMod: p.openMod === m.mi ? -1 : m.mi }))}
                    className="grid w-full cursor-pointer grid-cols-[40px_1fr_auto_20px] items-center gap-2.5 py-3.5 text-left lg:grid-cols-[56px_1fr_140px_auto_20px] lg:gap-3.5 lg:py-4 lg:hover:bg-sd-ink/4"
                  >
                    <span className={clsx("text-[22px] font-extrabold lg:text-[28px]", m.n ? "text-sd-accent" : "text-sd-n-500")}>{m.num}</span>
                    <span className="flex min-w-0 flex-col"><span className="text-[15px] leading-[1.2] font-extrabold lg:text-[17px]">{m.title}</span><span className="text-xs text-sd-n-700">{m.meta}</span></span>
                    <Bar value={(m.n / m.total) * 100} grow className="hidden h-1.5 lg:block" style={stagger(m.mi, 40, 120)} />
                    <span className={clsx("flex items-center gap-1 text-xs font-semibold lg:min-w-12 lg:text-[13px]", m.complete ? "text-sd-ink" : m.n ? "text-sd-accent-700" : "text-sd-n-600")}>
                      {m.complete && <Icon name="check" size={16} />}{m.complete ? "Done" : `${m.n}/${m.total}`}
                    </span>
                    <span className="flex text-sd-n-600"><Icon name={open ? "chevU" : "chevD"} size={16} /></span>
                  </button>
                  {open && (
                    <div className="sd-a-in-fast flex flex-col pb-3 pl-[50px] lg:grid lg:grid-cols-3 lg:gap-2 lg:pb-4 lg:pl-[70px]">
                      {m.ids.map((id) => {
                        const v = lessonView(s, id);
                        return (
                          <button
                            key={id}
                            type="button"
                            onClick={() => act((p) => openLesson(p, id))}
                            className={clsx(
                              "grid min-h-11 cursor-pointer grid-cols-[24px_1fr_auto] items-center gap-2.5 rounded-lg px-2 py-[9px] text-left text-sm hover:bg-sd-accent-100",
                              "lg:min-h-24 lg:grid-cols-[auto_1fr] lg:grid-rows-[auto_1fr] lg:items-start lg:p-3 lg:outline lg:-outline-offset-1 lg:outline-sd-divider",
                              v.cur ? "bg-sd-accent-100" : "bg-transparent",
                            )}
                          >
                            <LessonMark done={v.done} cur={v.cur} locked={v.locked} />
                            <span className={clsx("lg:order-3 lg:col-span-2 lg:leading-[1.3]", v.cur && "font-extrabold", v.dim && "opacity-45")}>{v.title}</span>
                            <span className="lg:order-2 lg:justify-self-end"><Duration v={v} /></span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <div className="order-1 flex flex-col gap-3 lg:order-none">
          <div className="flex flex-col gap-1.5 lg:border-b-2 lg:border-sd-divider lg:pb-4">
            <span className="hidden text-[56px] leading-[0.9] font-extrabold tracking-[-0.04em] lg:block">{coursePct}%</span>
            <span className="text-[13px]">{doneCount} of {LESSON_COUNT} lessons</span>
            <Bar value={coursePct} grow className="h-1.5" style={{ animationDelay: "150ms", animationDuration: ".9s" }} />
          </div>
          <AssessmentRow kind="lessons" s={s} act={act} />
          <AssessmentRow kind="final" s={s} act={act} />
        </div>

        <section aria-labelledby="sd-intro" className="order-3 lg:col-start-2 lg:order-none">
          <h3 id="sd-intro" className="sd-h6 mb-2">Course intro</h3>
          <OverviewVideo />
        </section>
      </div>
    </div>
  );
}
