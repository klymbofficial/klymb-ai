"use client";

import clsx from "clsx";
import Image from "next/image";
import { StudyBuddy } from "@/components/learner/StudyBuddy";
import { LESSON_COUNT, PASS_MARK, checkAverage, dayOf, fmt, isSoon, lesson, lessonDay, lessonSteps, localDate, openLesson, pct, startQuiz, streak, type CourseState } from "@/lib/course-app";
import { lastCheckLesson } from "./Course";
import { GoogleButton, firstName, useCourseUser } from "../user";
import { Icon } from "../icons";
import { Bar, parallax, stagger } from "../ui";
import type { Act } from "../useCourseApp";

const WEEK = ["M", "T", "W", "T", "F", "S", "S"];

/** This week, Monday first: which days had a finished step, and which one is today. */
function thisWeek(s: CourseState, now = new Date()) {
  const mon = new Date(now);
  mon.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  return WEEK.map((l, i) => {
    const d = new Date(mon);
    d.setDate(mon.getDate() + i);
    const key = localDate(d);
    return { l, done: s.activeDays.includes(key), today: key === localDate(now), future: d > now && key !== localDate(now) };
  });
}

function greeting(now = new Date()) {
  const h = now.getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

export function BellButton({ s, act }: { s: CourseState; act: Act }) {
  const unread = s.notifs.filter((n) => n.unread).length;
  return (
    <button type="button" onClick={() => act((p) => ({ ...p, screen: "notifs" }))} aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`} className="sd-btn sd-btn-secondary sd-btn-icon relative h-[34px]">
      <Icon name="bell" size={16} />
      {unread > 0 && <span className="absolute -top-[7px] -right-[7px] h-[18px] min-w-[18px] rounded-full bg-sd-accent px-1 text-left text-[10px] leading-[18px] font-extrabold text-sd-bg">{unread}</span>}
    </button>
  );
}

export function GoalCard({ s }: { s: CourseState }) {
  const gm = Math.floor(s.todaySec / 60);
  const met = s.todaySec >= s.goal * 60;
  return (
    <div className="sd-a-in grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1.5 rounded-xl bg-sd-surface px-3.5 py-3" style={{ animationDelay: "50ms" }}>
      <span className="text-sm font-extrabold">Today’s goal · {Math.min(gm, s.goal)} / {s.goal} min</span>
      <span className="text-xs font-semibold text-sd-accent-700">{met ? "Goal met" : `${s.goal - gm} min to go`}</span>
      <Bar value={(s.todaySec / (s.goal * 60)) * 100} className="col-span-full h-1.5" />
      <span className="col-span-full text-xs text-sd-n-700">{streak(s).today ? "Your streak is safe today." : "One lesson today keeps your streak going."}</span>
    </div>
  );
}

const STEP_NAME: Record<string, string> = { watch: "the video", reveal: "Learn", prove: "Prove it", estimate: "Estimate", build: "Build it", design: "Design it", follow: "the follow-ups", done: "the finish" };

/** Kamran's line on Home: one thing about where the learner is right now. */
function kamranSays(s: CourseState, first: string | null) {
  const day = dayOf(s.cur);
  const name = lessonDay(s.cur);
  const hi = first ? `Hi ${first}! ` : "Welcome back! ";
  if (isSoon(s.cur)) return `Nice work, you’ve done everything that’s out. ${name} is coming soon, I’ll keep it ready.`;
  if (!day) return `${name} is ready when you are.`;
  const p = s.lessons[s.cur];
  if (!s.done.length && !p) return `Hi${first ? ` ${first}` : ""}, I’m Kamran. ${name} is ready when you are: about ${day.minutes} minutes.`;
  if (!p) return `${hi}${name} is ready when you are: about ${day.minutes} minutes.`;
  const next = lessonSteps(s, s.cur, day).find((x) => !x.done);
  return `${hi}You’re on ${name}, at ${STEP_NAME[next?.key ?? "done"]}. Pick up where you left off.`;
}

export function Home({ s, act }: { s: CourseState; act: Act }) {
  const user = useCourseUser();
  const c = lesson(s.cur);
  const postP = s.post ? pct(s.post) : null;
  const doneCount = s.done.length;
  const coursePct = `${Math.round((doneCount / LESSON_COUNT) * 100)}%`;
  const st = streak(s);
  const week = thisWeek(s);
  const hello = greeting();
  const path = [
    { num: "01", title: "Video lessons", sub: "Day 0 + 21 days of lessons", value: `${doneCount}/${LESSON_COUNT}`, go: () => act((p) => ({ ...p, screen: "course", tab: "course" })) },
    {
      num: "02", title: "Lesson assessments", sub: `5 questions each · ${Math.round(PASS_MARK * 100)}% to pass`, value: checkAverage(s),
      go: () => act((p) => openLesson(p, lastCheckLesson(p))),
    },
    {
      num: "03", title: "Final assessment", sub: s.post ? "Done" : "After Day 21", value: postP ?? "—",
      go: () => act((p) => (p.post ? { ...p, screen: "results", lastKind: "post" } : startQuiz(p, "post"))),
    },
  ];

  return (
    <div className="sd-a-screen flex max-w-[1120px] flex-col gap-6 px-5 pt-2 pb-7 lg:gap-7 lg:px-0 lg:pt-0 lg:pb-0">
      {/* Mobile header: wordmark, bell, streak; then the greeting, which drifts on scroll. */}
      <div className="flex items-center justify-between lg:hidden">
        <Image src="/brand/klymb-logo.svg" alt="Klymb.ai" width={104} height={16} className="h-4 w-auto" priority />
        <div className="flex items-center gap-1.5">
          <button type="button" onClick={() => act((p) => ({ ...p, screen: "progress", tab: "progress" }))} className="flex cursor-pointer items-center gap-1.5 border border-sd-divider px-2.5 py-1.5 text-[13px] font-extrabold hover:bg-sd-accent-100">
            <span className="flex text-sd-accent"><Icon name="flame" size={16} /></span>{st.current} {st.current === 1 ? "day" : "days"}
          </button>
        </div>
      </div>
      <div className="sd-drift lg:hidden">
        <div className="text-[11px] font-semibold tracking-[0.1em] text-sd-accent-700 uppercase">System Design</div>
        <h2 className="mt-1.5 text-[30px] tracking-[-0.02em]">{hello}</h2>
      </div>
      {/* Web header. */}
      <div className="hidden flex-wrap items-end justify-between gap-4 border-b-2 border-sd-divider pb-4 lg:flex">
        <h1 className="m-0 text-[42px] tracking-[-0.03em]">{hello}</h1>
        <span className="text-sm text-sd-n-700">{doneCount} of {LESSON_COUNT} lessons · {coursePct} complete</span>
      </div>

      <div className="sd-a-in flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between" style={{ animationDuration: ".5s" }}>
        <StudyBuddy tone="light" size={88} message={kamranSays(s, firstName(user))} />
        {!user && s.done.length > 0 && <div className="sm:w-[280px]"><GoogleButton lesson={s.cur} where="home" label="Save progress with Google" className="h-11 border-2 border-sd-ink" /></div>}
      </div>

      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,1.5fr)_minmax(280px,1fr)] lg:items-start lg:gap-8">
        <button
          type="button"
          onClick={() => act((p) => openLesson(p, p.cur))}
          {...parallax}
          className="sd-a-in sd-hover-lift order-2 flex cursor-pointer flex-col overflow-hidden rounded-xl bg-sd-surface p-0 text-left lg:order-1"
          style={{ animationDuration: ".6s", animationDelay: "100ms" }}
        >
          <div className="sd-grid relative flex h-[184px] w-full flex-col justify-between px-4 py-3.5 [--grid:23px] lg:aspect-video lg:h-auto lg:px-6 lg:py-[22px] lg:[--grid:28px]">
            <div className="sd-mid text-[11px] font-extrabold tracking-[0.1em] text-sd-accent-400 uppercase lg:text-xs">
              {doneCount || s.t ? "Continue" : "Start"} · {lessonDay(s.cur)}<span className="hidden lg:inline"> · {c.m.title}</span>
            </div>
            <div className="flex items-end justify-between gap-3 lg:gap-4">
              <div className="sd-near max-w-[250px] text-2xl leading-[1.1] font-extrabold tracking-[-0.02em] lg:max-w-[460px] lg:text-[40px] lg:leading-[1.02] lg:tracking-[-0.03em]">{c.title}</div>
              <div className="sd-mid flex size-12 flex-none items-center justify-center rounded-lg bg-sd-accent text-sd-bg lg:size-16"><Icon name="play" /></div>
            </div>
          </div>
          <Bar value={(s.t / c.secs) * 100} className="h-1 w-full" />
          <div className="flex w-full justify-between px-4 py-2.5 text-[13px] lg:px-5 lg:py-3 lg:text-sm">
            <span className="lg:hidden">{c.m.title}</span>
            <span className="hidden lg:inline">{lessonDay(s.cur)} · {c.m.title}</span>
            <span className="font-semibold">{fmt(s.t)} / {c.dur}</span>
          </div>
        </button>

        <div className="contents lg:order-2 lg:flex lg:flex-col lg:gap-7">
          <div className="order-1 lg:order-none"><GoalCard s={s} /></div>
          <div className="order-3 lg:order-none">
            <h6 className="sd-h6 mb-2">Your path</h6>
            <div className="border-t-2 border-sd-divider">
              {path.map((r, i) => (
                <button
                  key={r.num}
                  type="button"
                  onClick={r.go}
                  className="sd-a-in grid w-full cursor-pointer grid-cols-[36px_1fr_auto_20px] items-center gap-2.5 border-b border-sd-divider py-3.5 text-left hover:bg-sd-ink/4 lg:grid-cols-[40px_1fr_auto_20px] lg:py-4"
                  style={stagger(i, 80, 200)}
                >
                  <span className="text-xl font-extrabold text-sd-accent lg:text-[22px]">{r.num}</span>
                  <span className="flex flex-col"><span className="text-base font-extrabold">{r.title}</span><span className="text-xs text-sd-n-700">{r.sub}</span></span>
                  <span className="text-sm font-extrabold lg:text-[15px]">{r.value}</span>
                  <span className="flex text-sd-n-600"><Icon name="chevR" size={16} /></span>
                </button>
              ))}
            </div>
          </div>
          <div className="order-4 lg:order-none">
            <div className="mb-2 flex items-baseline justify-between"><h6 className="sd-h6">This week</h6><span className="text-xs text-sd-n-700">{week.filter((d) => d.done).length} of 7 days</span></div>
            <div className="grid grid-cols-7 gap-1">
              {week.map(({ l, done, today }, i) => {
                return (
                  <div key={i} className="flex flex-col gap-1">
                    <div className={clsx("sd-a-pop flex aspect-square items-center justify-center rounded-lg text-sd-bg", done ? "bg-sd-accent" : "border-[1.5px] border-dashed border-sd-divider")} style={stagger(i, 50, 350)}>
                      {done && <Icon name="check" size={14} stroke={3} />}
                    </div>
                    <span className={clsx("text-[11px]", today && "font-extrabold")}>{today ? "Today" : l}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
