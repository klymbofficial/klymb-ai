"use client";

import clsx from "clsx";
import { useState, type ReactNode } from "react";
import type { Day, DayCopy } from "@/data/system-design/types";
import { ALL_IDS, completeNext, isSoon, lesson, lessonSteps, pad, score, updateLesson, type CourseState, type LessonProgress, type StepKey } from "@/lib/course-app";
import { Icon } from "../icons";
import { Segmented, stagger } from "../ui";
import type { Act } from "../useCourseApp";
import { DesignIt } from "./DesignIt";
import { DiagramBuilder } from "./DiagramBuilder";
import { EstimateQuiz } from "./EstimateQuiz";
import { Feedback } from "./Feedback";
import { FollowUps } from "./FollowUps";
import { LessonCheck } from "./LessonCheck";
import { StudyBuddy } from "@/components/learner/StudyBuddy";
import { track } from "../track";
import { GoogleButton, useCourseUser } from "../user";

const UI = {
  en: {
    steps: { watch: "Watch", reveal: "Learn", prove: "Prove it", estimate: "Estimate", build: "Build it", design: "Design it", follow: "Follow-ups", done: "Done" } as Record<StepKey, string>,
    path: "Today’s path", stepOf: (n: number, of: number) => `Step ${n} of ${of}`,
    reveal: "What really happens", build: "Build it yourself", prove: "Prove it", follow: "Interviewer follow-ups", unlocked: "Day complete",
    proveSub: "5 questions · 60% to pass · answers at the end", concept: "Today’s idea",
    built: (n: number) => (n === 0 ? "Built on the first try." : `Built, with ${n} wrong ${n === 1 ? "drop" : "drops"} on the way.`),
    followed: (n: number, of: number) => `You had ${n} of ${of} follow-ups covered.`,
    estimate: "Estimate it", estimateSub: "Back-of-the-envelope numbers", estimated: (n: number, of: number) => `${n} of ${of} estimates in range.`,
    design: "Design it", designSub: "Attempt first, then the walkthrough", designed: "Attempt written, walkthrough read.",
    reference: "Optional reference",
    scored: (b: number, bOf: number) => `Prove it: ${b} of ${bOf} right`,
    savePrompt: (day: number) => `Day ${day} done! Sign in so it’s saved to your name, on any phone or laptop, and your streak keeps counting.`,
    readDone: "Got it", toNext: (label: string) => `Next: ${label}`,
    cheatsheet: "Cheatsheet", interview: "Say it in 2 minutes", share: "Share on LinkedIn",
    shareNote: "Download the image, then post. The text is copied for you: paste it, attach the image, done.",
    download: "Download image", post: "Copy text and open LinkedIn", copied: "Copied. Paste it in LinkedIn",
    complete: "Mark complete", redo: "Do this lesson again",
  },
  hi: {
    steps: { watch: "Watch", reveal: "Samjho", prove: "Prove it", estimate: "Estimate", build: "Build it", design: "Design it", follow: "Follow-ups", done: "Done" } as Record<StepKey, string>,
    path: "Aaj ka raasta", stepOf: (n: number, of: number) => `Step ${n} / ${of}`,
    reveal: "Asal mein kya hota hai", build: "Khud banao", prove: "Prove it", follow: "Interviewer follow-ups", unlocked: "Day complete",
    proveSub: "5 sawaal · 60% se pass · jawab end mein", concept: "Aaj ka idea",
    built: (n: number) => (n === 0 ? "Pehli baar mein ban gaya." : `Ban gaya, raaste mein ${n} galat drop.`),
    followed: (n: number, of: number) => `${of} mein se ${n} follow-ups aate the.`,
    estimate: "Estimate it", estimateSub: "Rough hisaab, napkin pe", estimated: (n: number, of: number) => `${of} mein se ${n} estimates range mein.`,
    design: "Design it", designSub: "Pehle khud try, phir walkthrough", designed: "Attempt likha, walkthrough padha.",
    reference: "Optional reference",
    scored: (b: number, bOf: number) => `Prove it: ${bOf} mein se ${b} sahi`,
    savePrompt: (day: number) => `Day ${day} ho gaya! Sign in karo taaki yeh tumhare naam pe save ho, kisi bhi phone ya laptop pe, aur streak chalti rahe.`,
    readDone: "Samajh gaya", toNext: (label: string) => `Agla: ${label}`,
    cheatsheet: "Cheatsheet", interview: "2 minute mein aise bolo", share: "LinkedIn par share karo",
    shareNote: "Image download karo, phir post karo. Text copy ho jayega: paste karo, image lagao, ho gaya.",
    download: "Image download karo", post: "Text copy karo, LinkedIn kholo", copied: "Copied. LinkedIn mein paste karo",
    complete: "Mark complete", redo: "Yeh lesson phir se karo",
  },
};
type Ui = (typeof UI)["en"];

/** How many estimates landed within tolerance. */
export function inRange(items: { answer: number; tolerance: number }[], mine: number[]) {
  return items.filter((q, i) => mine[i] !== undefined && Math.abs(mine[i] / q.answer - 1) <= q.tolerance).length;
}

export function LangSwitch({ s, act }: { s: CourseState; act: Act }) {
  return (
    <Segmented
      value={s.lang}
      options={[["en", "English"], ["hi", "Hinglish"]]}
      onChange={(lang) => act((p) => ({ ...p, lang }))}
      className="w-[180px] flex-none"
      itemClass="px-2.5 py-1.5 text-xs text-center"
    />
  );
}

/** The step bar under the lesson header: where you are, what's done, what's next. Tap an open step to jump to it. */
export function LessonPath({ s, act, id, day }: { s: CourseState; act: Act; id: string; day: Day }) {
  const ui = UI[s.lang];
  const steps = lessonSteps(s, id, day);
  const cur = steps.findIndex((x) => x.key === s.stage);
  return (
    <nav data-tour="path" aria-label={ui.path} className="sticky top-0 z-[3] border-b-2 border-sd-divider bg-sd-bg/95 px-5 py-2.5 backdrop-blur lg:px-0">
      <ol className="flex gap-1">
        {steps.map((st, i) => {
          const now = st.key === s.stage;
          return (
            <li key={st.key} className="min-w-0 flex-1">
              <button
                type="button"
                disabled={!st.open || s.checkBusy}
                onClick={() => act((p) => ({ ...p, stage: st.key, playing: false }))}
                aria-current={now ? "step" : undefined}
                title={ui.steps[st.key]}
                className="flex w-full cursor-pointer flex-col items-start gap-1 text-left disabled:cursor-default"
              >
                <span className={clsx("block h-[5px] w-full rounded-full transition-colors duration-500", st.done ? "bg-sd-accent" : now ? "bg-sd-ink" : "bg-sd-n-300")} />
                <span className={clsx("hidden w-full truncate text-[11px] font-extrabold tracking-[0.04em] uppercase sm:block", now ? "text-sd-ink" : st.done ? "text-sd-accent-700" : "text-sd-n-500")}>
                  {pad(i + 1)} {ui.steps[st.key]}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
      <p className="m-0 mt-1.5 text-[11px] font-extrabold tracking-[0.04em] uppercase sm:hidden">
        {ui.stepOf(cur + 1, steps.length)} · {ui.steps[s.stage]}
      </p>
    </nav>
  );
}

/** The day's framing, above the video: the interview question this lesson answers. */
export function DayHeader({ s, day }: { s: CourseState; day: Day }) {
  const c = day.copy[s.lang];
  return (
    <div className="sd-a-in mb-3 flex flex-col gap-2 lg:mb-4">
      <span className="sd-kicker text-sd-accent-700">{c.tag ?? "Interview question"} · Day {day.day} · about {day.minutes} minutes</span>
      <h2 className="m-0 text-[22px] leading-[1.05] tracking-[-0.03em] text-pretty sm:text-[26px] lg:text-[34px]">{c.question}</h2>
      <div className="flex flex-col gap-0.5 text-sm text-sd-n-800 sm:text-[15px]">
        {c.hookLines.map((l, i) => <span key={l} className={clsx(i > 0 && "hidden sm:block")}>{l}</span>)}
      </div>
    </div>
  );
}

/** The step on show: its number and name, then the step itself. */
function Step({ n, title, sub, children }: { n: number; title: string; sub?: string; children?: ReactNode }) {
  return (
    <section className="sd-a-in flex flex-1 flex-col" aria-label={title}>
      <div className="grid grid-cols-[40px_1fr] items-start gap-2.5 border-b border-sd-divider pb-3">
        <span className="text-[22px] leading-none font-extrabold text-sd-accent">{pad(n)}</span>
        <div className="flex flex-col">
          <span className="text-[17px] leading-[1.2] font-extrabold">{title}</span>
          {sub && <span className="text-xs text-sd-n-700">{sub}</span>}
        </div>
      </div>
      {/* The step owns the phone's screen, so its body stretches and short steps drop their action to the foot of it. */}
      <div className="flex flex-1 flex-col pt-4">{children}</div>
    </section>
  );
}

/** A step already finished: what you did, and the way on. */
function Done({ text, next, onNext }: { text: string; next: string; onNext: () => void }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <span className="flex items-center gap-2 text-sm font-extrabold"><span className="flex size-6 items-center justify-center rounded-md bg-sd-ink text-sd-bg"><Icon name="check" size={14} stroke={3} /></span>{text}</span>
      <button type="button" onClick={onNext} className="sd-btn sd-btn-secondary h-10 gap-2">{next}<Icon name="arrowR" size={16} /></button>
    </div>
  );
}

function Explain({ items }: { items: NonNullable<DayCopy["explain"]>["items"] }) {
  return (
    <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
      {items.map((x) => (
        <div key={x.term} className="flex flex-col gap-1 border-l-2 border-sd-n-300 py-1 pl-3">
          <span className="text-sm font-extrabold">{x.term}</span>
          <span className="text-[13px] leading-[1.45] text-sd-n-800">{x.what}</span>
          <span className="text-xs text-sd-n-700">e.g. {x.example}</span>
        </div>
      ))}
    </div>
  );
}

function Reveal({ c, ui, read, onRead }: { c: DayCopy; ui: Ui; read: boolean; onRead: () => void }) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h6 className="sd-h6 mb-2">{c.revealTitle}</h6>
        <div className="border-t-2 border-sd-divider">
          {c.reveal.map((r, i) => (
            <div key={r.what} className="sd-a-in grid grid-cols-[150px_1fr] gap-3 border-b border-sd-divider py-2.5 text-sm max-sm:grid-cols-1 max-sm:gap-0.5" style={stagger(i, 50, 0)}>
              <span className="font-extrabold text-sd-accent-700">{r.when}</span>
              <span className="leading-[1.45]">{r.what}</span>
            </div>
          ))}
        </div>
        {c.sourceNote && <span className="mt-2 block text-xs text-sd-n-700">{c.sourceNote}</span>}
      </div>
      {c.explain && (
        <div>
          <h6 className="sd-h6 mb-2">{c.explain.title}{c.explain.optional && <span className="ml-2 font-semibold text-sd-n-700">· {ui.reference}</span>}</h6>
          <Explain items={c.explain.items} />
        </div>
      )}
      <div>
        <h6 className="sd-h6 mb-2">{ui.concept}</h6>
        <div className="grid gap-2 sm:grid-cols-2">
          {c.concept.cards.map((x, k) => (
            <div key={x.name} className={clsx("flex flex-col gap-2 p-4", k === 0 ? "bg-sd-ink text-sd-bg" : "bg-sd-accent text-sd-bg")}>
              <span className="text-[19px] leading-[1.15] font-extrabold">{x.name}</span>
              <span className="text-xs text-sd-bg/80">{x.examples.join(" · ")}</span>
              <div className="flex flex-col gap-1 border-t border-white/25 pt-2 text-sm">{x.moves.map((m) => <span key={m}>{m}</span>)}</div>
            </div>
          ))}
        </div>
        <p className="m-0 mt-2 rounded-xl bg-sd-surface px-3.5 py-3 text-sm font-semibold">{c.concept.rule}</p>
      </div>
      {!read && <button type="button" onClick={onRead} className="sd-btn sd-btn-primary h-12 self-start gap-2">{ui.readDone} · {ui.toNext(ui.steps.prove)}<Icon name="arrowR" size={16} /></button>}
    </div>
  );
}

function Unlocked({ s, act, id, day, c, ui }: { s: CourseState; act: Act; id: string; day: Day; c: DayCopy; ui: Ui }) {
  const [copied, setCopied] = useState(false);
  const user = useCourseUser();
  const p = s.lessons[id] ?? {};
  const image = `/images/system-design/day-${day.day}-linkedin-${s.lang}.png`;
  // LinkedIn's share link prefills the text but can't carry an image, so the text also goes on the clipboard.
  const share = async () => {
    track("share", id, "done", { kind: "linkedin" });
    try { await navigator.clipboard.writeText(c.linkedin); setCopied(true); } catch { /* blocked: the prefill still works */ }
    window.open(`https://www.linkedin.com/feed/?shareActive=true&text=${encodeURIComponent(c.linkedin)}`, "_blank", "noopener,noreferrer");
  };
  return (
    <div className="flex flex-col gap-6">
      <div className="sd-a-pop flex items-end justify-between rounded-xl bg-sd-accent p-4 text-sd-bg">
        <div className="flex flex-col"><span className="sd-kicker">Day {day.day} complete</span><span className="text-[22px] font-extrabold tracking-[-0.02em]">{ui.scored(score(c.post, p.post ?? []), c.post.length)}</span></div>
        <Icon name="flame" size={32} />
      </div>
      {!user && (
        <div className="flex flex-col gap-3 rounded-xl border-2 border-sd-ink p-4">
          <StudyBuddy tone="light" size={72} message={ui.savePrompt(day.day)} />
          <GoogleButton lesson={id} where="day-done" label="Save my progress with Google" className="h-12 border-2 border-sd-ink sm:max-w-[360px]" />
        </div>
      )}
      <Feedback lesson={id} day={day.day} lang={s.lang} sent={!!p.feedback} onSent={() => act((q) => updateLesson(q, id, { feedback: true }))} />
      <div>
        <h6 className="sd-h6 mb-2">{ui.cheatsheet} · {c.cheatsheet.title}</h6>
        <div className="border-t-2 border-sd-divider">
          {c.cheatsheet.points.map((pt, i) => (
            <div key={pt} className="grid grid-cols-[32px_1fr] gap-2.5 border-b border-sd-divider py-2.5 text-[15px] leading-[1.4]"><span className="font-extrabold text-sd-accent">{pad(i + 1)}</span><span>{pt}</span></div>
          ))}
        </div>
      </div>
      <div>
        <h6 className="sd-h6 mb-2">{ui.interview}</h6>
        <div className="flex flex-col gap-2 rounded-xl bg-sd-surface p-4 text-[15px] leading-[1.45]">{c.interview.map((l, i) => <span key={l}><b className="text-sd-accent">{i + 1}.</b> {l}</span>)}</div>
      </div>
      <div>
        <h6 className="sd-h6 mb-1">{ui.share}</h6>
        <span className="mb-3 block text-sm text-sd-n-800">{ui.shareNote}</span>
        {/* eslint-disable-next-line @next/next/no-img-element -- the same file the learner downloads */}
        <img src={image} alt={c.cheatsheet.title} width={1080} height={1350} className="w-full max-w-[420px] border border-sd-divider" />
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <a href={image} download={`klymb-system-design-day-${day.day}.png`} onClick={() => track("share", id, "done", { kind: "image" })} className="sd-btn sd-btn-secondary h-11 gap-2"><Icon name="download" size={16} />{ui.download}</a>
          <button type="button" onClick={share} className="sd-btn sd-btn-primary h-11">{copied ? ui.copied : ui.post}</button>
        </div>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <button type="button" onClick={() => act((q) => completeNext(q, false))} className="sd-btn sd-btn-primary h-12 gap-2"><Icon name="check" size={16} />{ui.complete}</button>
        <button type="button" onClick={() => act((q) => ({ ...updateLesson(q, id, null), t: 0, playing: false, stage: "watch" }))} className="sd-btn sd-btn-ghost h-12">{ui.redo}</button>
      </div>
    </div>
  );
}

/** The step the lesson is on, in place of the video: one at a time, and finishing one opens the next. */
export function LessonStage({ s, act, id, day }: { s: CourseState; act: Act; id: string; day: Day }) {
  const ui = UI[s.lang];
  const c = day.copy[s.lang];
  const p: LessonProgress = s.lessons[id] ?? {};
  const steps = lessonSteps(s, id, day);
  const at = s.stage;
  const num = steps.findIndex((x) => x.key === at) + 1;
  const after = (k: StepKey) => steps[steps.findIndex((x) => x.key === k) + 1]?.key ?? "done";
  const go = (k: StepKey) => act((q) => ({ ...q, stage: k, checkBusy: false }));
  /** Saves the step and moves the column on to the next one. */
  const set = (patch: Partial<LessonProgress>, next?: StepKey) => act((q) => {
    const n = updateLesson(q, id, patch);
    return next ? { ...n, stage: next } : n;
  });
  const onward = (k: StepKey) => ui.toNext(ui.steps[after(k)]);
  const nextLesson = ALL_IDS[ALL_IDS.indexOf(id) + 1];

  return (
    <div data-tour="practice" className="flex flex-1 flex-col">
      {at === "reveal" && (
        <Step n={num} title={ui.reveal} sub={c.revealSub}>
          <Reveal c={c} ui={ui} read={!!p.read || !!p.post} onRead={() => set({ read: true }, "prove")} />
        </Step>
      )}

      {at === "prove" && (
        <Step n={num} title={ui.prove} sub={ui.proveSub}>
          <LessonCheck
            key={id}
            s={s}
            act={act}
            id={id}
            title={lesson(id).title}
            questions={c.post}
            hasNext={!!nextLesson && !isSoon(nextLesson)}
            next={onward("prove")}
            onPass={() => go(after("prove"))}
            onRewatch={() => act((q) => ({ ...q, stage: "watch", checkBusy: false, t: 0, playing: true, ended: false, upNext: 0 }))}
          />
        </Step>
      )}

      {at === "estimate" && c.estimates?.length ? (
        <Step n={num} title={ui.estimate} sub={ui.estimateSub}>
          {p.est
            ? <Done text={ui.estimated(inRange(c.estimates, p.est), c.estimates.length)} next={onward("estimate")} onNext={() => go(after("estimate"))} />
            : <EstimateQuiz key={s.lang} items={c.estimates} lang={s.lang} onDone={(est) => set({ est }, after("estimate"))} />}
        </Step>
      ) : null}

      {at === "build" && c.build && (
        <Step n={num} title={ui.build} sub={c.build.title}>
          {p.built !== undefined
            ? <Done text={ui.built(p.built)} next={onward("build")} onNext={() => go(after("build"))} />
            : <DiagramBuilder key={s.lang} task={c.build} lang={s.lang} onDone={(built) => set({ built }, after("build"))} />}
        </Step>
      )}

      {at === "design" && c.design && (
        <Step n={num} title={ui.design} sub={ui.designSub}>
          <DesignIt key={s.lang} task={c.design} lang={s.lang} saved={p.design} checks={p.checks} onSave={(design) => set({ design })} onChecks={(checks) => set({ checks })} onContinue={() => go(after("design"))} />
        </Step>
      )}

      {at === "follow" && c.followUps?.length ? (
        <Step n={num} title={ui.follow} sub={`${c.followUps.length} “what if” questions`}>
          {p.follow
            ? <Done text={ui.followed(p.follow.filter(Boolean).length, p.follow.length)} next={onward("follow")} onNext={() => go("done")} />
            : <FollowUps key={s.lang} items={c.followUps} lang={s.lang} onDone={(follow) => set({ follow }, "done")} />}
        </Step>
      ) : null}

      {at === "done" && (
        <Step n={num} title={ui.unlocked} sub={c.cheatsheet.title}>
          <Unlocked s={s} act={act} id={id} day={day} c={c} ui={ui} />
        </Step>
      )}
    </div>
  );
}
