"use client";

import clsx from "clsx";
import { MODULES } from "@/data/system-design/course-app";
import { LESSON_COUNT, moduleIds, moduleMinutes, openLesson, pad, pct, startQuiz, type CourseState } from "@/lib/course-app";
import { Icon } from "../icons";
import { Bar, Duration, LessonMark, lessonView, stagger } from "../ui";
import type { Act } from "../useCourseApp";

/** Per-module progress, shared with the Progress screen. */
export function moduleViews(s: CourseState) {
  return MODULES.map((m, mi) => {
    const ids = moduleIds(mi);
    const n = ids.filter((id) => s.done.includes(id)).length;
    return { mi, num: pad(mi + 1), title: m.title, meta: `${m.lessons.length} lessons · ${moduleMinutes(mi)} min`, n, total: ids.length, complete: n === ids.length, ids };
  });
}

function AssessmentRow({ kind, s, act }: { kind: "pre" | "post"; s: CourseState; act: Act }) {
  const pre = kind === "pre";
  const go = () => act((p) => (pre ? { ...p, screen: "results", lastKind: "pre" } : p.post ? { ...p, screen: "results", lastKind: "post" } : startQuiz(p, "post")));
  return (
    <button type="button" onClick={go} className="flex cursor-pointer items-center gap-3 bg-sd-surface p-3.5 text-left hover:bg-sd-n-300">
      <span className={clsx("flex size-9 flex-none items-center justify-center text-sd-bg", pre ? "bg-sd-ink" : "bg-sd-accent")}><Icon name={pre ? "target" : "trending"} /></span>
      <span className="flex flex-1 flex-col">
        <span className="text-[15px] font-extrabold">{pre ? "Pre-assessment" : "Post-assessment"}</span>
        <span className="text-xs text-sd-n-700">{pre ? `Baseline set · ${pct(s.pre)}` : s.post ? `Done · ${pct(s.post)}` : "Not taken yet · best after Module 08"}</span>
      </span>
      {pre ? <span className="sd-tag sd-tag-neutral">Done</span> : <span className="flex text-sd-n-600"><Icon name="chevR" size={16} /></span>}
    </button>
  );
}

export function Course({ s, act }: { s: CourseState; act: Act }) {
  const doneCount = s.done.length;
  const coursePct = Math.round((doneCount / LESSON_COUNT) * 100);
  const mods = moduleViews(s);

  return (
    <div className="sd-a-screen flex max-w-[1120px] flex-col gap-[18px] px-5 pt-2 pb-7 lg:grid lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start lg:gap-10 lg:p-0">
      <div className="contents lg:block">
        <div className="order-1 lg:border-b-2 lg:border-sd-divider lg:pb-4">
          <h2 className="m-0 text-[30px] tracking-[-0.02em] lg:text-[42px] lg:tracking-[-0.03em]">Course</h2>
          <div className="text-[13px] text-sd-n-700 lg:text-sm">System Design · 8 modules · {LESSON_COUNT} lessons</div>
        </div>
        <div className="order-4 border-t-2 border-sd-divider lg:border-t-0">
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
                            "grid cursor-pointer grid-cols-[24px_1fr_auto] items-center gap-2.5 px-2 py-[9px] text-left text-sm hover:bg-sd-accent-100",
                            "lg:min-h-24 lg:grid-cols-[auto_1fr] lg:grid-rows-[auto_1fr] lg:items-start lg:p-3 lg:outline lg:-outline-offset-1 lg:outline-sd-divider",
                            v.cur ? "bg-sd-accent-100" : "bg-transparent",
                          )}
                        >
                          <LessonMark done={v.done} cur={v.cur} />
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
      </div>

      <div className="contents lg:sticky lg:top-7 lg:flex lg:flex-col lg:gap-3">
        <div className="order-2 flex flex-col gap-1.5 lg:hidden">
          <div className="flex justify-between text-xs"><span>{doneCount} of {LESSON_COUNT} lessons</span><span className="font-extrabold">{coursePct}%</span></div>
          <Bar value={coursePct} grow className="h-1.5" style={{ animationDelay: "150ms", animationDuration: ".9s" }} />
        </div>
        <div className="hidden flex-col gap-1.5 border-b-2 border-sd-divider pb-4 lg:flex">
          <span className="text-[56px] leading-[0.9] font-extrabold tracking-[-0.04em]">{coursePct}%</span>
          <span className="text-[13px]">{doneCount} of {LESSON_COUNT} lessons</span>
          <Bar value={coursePct} grow className="h-1.5" style={{ animationDelay: "150ms", animationDuration: ".9s" }} />
        </div>
        <div className="order-3 flex flex-col lg:order-none"><AssessmentRow kind="pre" s={s} act={act} /></div>
        <div className="order-5 flex flex-col lg:order-none"><AssessmentRow kind="post" s={s} act={act} /></div>
      </div>
    </div>
  );
}
