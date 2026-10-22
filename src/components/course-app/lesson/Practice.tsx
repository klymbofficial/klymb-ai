"use client";

import clsx from "clsx";
import { useState, type ReactNode } from "react";
import type { Day, DayCopy } from "@/data/system-design/types";
import { completeNext, flowDone, pad, updateLesson, type CourseState, type LessonProgress } from "@/lib/course-app";
import { Icon } from "../icons";
import { Segmented, stagger } from "../ui";
import type { Act } from "../useCourseApp";
import { ChoiceQuiz, score } from "./ChoiceQuiz";
import { DiagramBuilder } from "./DiagramBuilder";
import { FollowUps } from "./FollowUps";

const UI = {
  en: {
    steps: { call: "Your call", watch: "Watch", reveal: "Learn", prove: "Prove it", build: "Build it", follow: "Follow-ups", done: "Done" } as Record<StepKey, string>,
    yourCall: "Your call", path: "Today’s path", stepOf: (n: number, of: number) => `Step ${n} of ${of}`,
    locked: "Finish the step before",
    reveal: "What really happens", build: "Build it yourself", prove: "Prove it", follow: "Interviewer follow-ups", unlocked: "Day complete",
    proveSub: "New scenarios, same ideas", yours: "Your answer vs the best move", you: "You", best: "Best", concept: "Today’s idea",
    watchFirst: "Watch the video first. Everything below opens after it.",
    built: (n: number) => (n === 0 ? "Built on the first try." : `Built, with ${n} wrong ${n === 1 ? "drop" : "drops"} on the way.`),
    followed: (n: number, of: number) => `You had ${n} of ${of} follow-ups covered.`,
    proved: (n: number, of: number) => `You got ${n} of ${of} right.`,
    before: (a: number, aOf: number, b: number, bOf: number) => `Your call ${a}/${aOf} → Prove it ${b}/${bOf}`,
    readDone: "Got it", toNext: (label: string) => `Next: ${label}`,
    cheatsheet: "Cheatsheet", interview: "Say it in 2 minutes", share: "Share on LinkedIn",
    shareNote: "Download the image, then post. The text is copied for you: paste it, attach the image, done.",
    download: "Download image", post: "Copy text and open LinkedIn", copied: "Copied. Paste it in LinkedIn",
    complete: "Mark complete", redo: "Do this lesson again",
  },
  hi: {
    steps: { call: "Your call", watch: "Watch", reveal: "Samjho", prove: "Prove it", build: "Build it", follow: "Follow-ups", done: "Done" } as Record<StepKey, string>,
    yourCall: "Your call", path: "Aaj ka raasta", stepOf: (n: number, of: number) => `Step ${n} / ${of}`,
    locked: "Pichla step poora karo",
    reveal: "Asal mein kya hota hai", build: "Khud banao", prove: "Prove it", follow: "Interviewer follow-ups", unlocked: "Day complete",
    proveSub: "Naye scenarios, wahi ideas", yours: "Tumhara answer vs best move", you: "Tum", best: "Best", concept: "Aaj ka idea",
    watchFirst: "Pehle video dekho. Neeche sab uske baad khulega.",
    built: (n: number) => (n === 0 ? "Pehli baar mein ban gaya." : `Ban gaya, raaste mein ${n} galat drop.`),
    followed: (n: number, of: number) => `${of} mein se ${n} follow-ups aate the.`,
    proved: (n: number, of: number) => `${of} mein se ${n} sahi.`,
    before: (a: number, aOf: number, b: number, bOf: number) => `Your call ${a}/${aOf} → Prove it ${b}/${bOf}`,
    readDone: "Samajh gaya", toNext: (label: string) => `Agla: ${label}`,
    cheatsheet: "Cheatsheet", interview: "2 minute mein aise bolo", share: "LinkedIn par share karo",
    shareNote: "Image download karo, phir post karo. Text copy ho jayega: paste karo, image lagao, ho gaya.",
    download: "Image download karo", post: "Text copy karo, LinkedIn kholo", copied: "Copied. LinkedIn mein paste karo",
    complete: "Mark complete", redo: "Yeh lesson phir se karo",
  },
};
type Ui = (typeof UI)["en"];

export type StepKey = "call" | "watch" | "reveal" | "prove" | "build" | "follow" | "done";

/** Scrolls the lesson to a step; every step's section carries id="lesson-<key>". */
export function goTo(key: StepKey, delay = 150) {
  window.setTimeout(() => document.getElementById(`lesson-${key}`)?.scrollIntoView({ behavior: "smooth", block: "start" }), delay);
}

/** The lesson's steps in order: your call → watch → learn → prove it → build it → follow-ups → done. */
export function lessonSteps(s: CourseState, id: string, day: Day) {
  const c = day.copy[s.lang];
  const p: LessonProgress = s.lessons[id] ?? {};
  const built = !c.build || p.built !== undefined;
  const steps: { key: StepKey; done: boolean; open: boolean }[] = [
    { key: "call", done: !!p.pre, open: true },
    { key: "watch", done: !!p.watched, open: !!p.pre },
    { key: "reveal", done: !!p.read || !!p.post, open: !!p.watched },
    { key: "prove", done: !!p.post, open: !!p.watched },
  ];
  if (c.build) steps.push({ key: "build", done: p.built !== undefined, open: !!p.post });
  if (c.followUps?.length) steps.push({ key: "follow", done: !!p.follow, open: !!p.post && built });
  steps.push({ key: "done", done: s.done.includes(id), open: flowDone(s, id) });
  return steps;
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
export function LessonPath({ s, id, day }: { s: CourseState; id: string; day: Day }) {
  const ui = UI[s.lang];
  const steps = lessonSteps(s, id, day);
  const cur = steps.findIndex((x) => !x.done);
  return (
    <nav aria-label={ui.path} className="sticky top-0 z-[3] border-b-2 border-sd-divider bg-sd-bg/95 px-5 py-2.5 backdrop-blur lg:px-0">
      <ol className="flex gap-1">
        {steps.map((st, i) => {
          const now = i === cur;
          return (
            <li key={st.key} className="min-w-0 flex-1">
              <button
                type="button"
                disabled={!st.open}
                onClick={() => goTo(st.key, 0)}
                aria-current={now ? "step" : undefined}
                className="flex w-full cursor-pointer flex-col items-start gap-1 text-left disabled:cursor-default"
              >
                <span className={clsx("block h-[5px] w-full transition-colors duration-500", st.done ? "bg-sd-accent" : now ? "bg-sd-ink" : "bg-sd-n-300")} />
                <span className={clsx("hidden w-full truncate text-[11px] font-extrabold tracking-[0.04em] uppercase sm:block", now ? "text-sd-ink" : st.done ? "text-sd-accent-700" : "text-sd-n-500")}>
                  {pad(i + 1)} {ui.steps[st.key]}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
      <p className="m-0 mt-1.5 text-[11px] font-extrabold tracking-[0.04em] uppercase sm:hidden">
        {cur === -1 ? ui.steps.done : `${ui.stepOf(cur + 1, steps.length)} · ${ui.steps[steps[cur].key]}`}
      </p>
    </nav>
  );
}

/** Before the video: the day's opening question and scenarios, in place of the player. */
export function YourCall({ s, act, id, day }: { s: CourseState; act: Act; id: string; day: Day }) {
  const ui = UI[s.lang];
  const c = day.copy[s.lang];
  return (
    <div id="lesson-call" className="sd-a-in flex scroll-mt-16 flex-col gap-4 bg-sd-surface p-4 lg:p-6">
      <div>
        <span className="sd-kicker text-sd-accent-700">{c.tag ?? "Interview question"} · Day {day.day}</span>
        <h2 className="m-0 mt-1.5 text-[26px] leading-[1.05] tracking-[-0.03em] text-pretty lg:text-[36px]">{c.question}</h2>
        <div className="mt-2 flex flex-col gap-0.5 text-[15px] text-sd-n-800">{c.hookLines.map((l) => <span key={l}>{l}</span>)}</div>
      </div>
      <ChoiceQuiz
        key={s.lang}
        questions={c.pre}
        label={ui.yourCall}
        lang={s.lang}
        onDone={(pre) => { act((p) => ({ ...updateLesson(p, id, { pre }), playing: true })); goTo("watch", 250); }}
      />
    </div>
  );
}

function Step({ id, n, title, sub, locked, lockedText, children }: { id: StepKey; n: number; title: string; sub?: string; locked: boolean; lockedText: string; children?: ReactNode }) {
  return (
    <section id={`lesson-${id}`} className={clsx("scroll-mt-16 border-b border-sd-divider py-4", locked && "opacity-55")} aria-label={title}>
      <div className="grid grid-cols-[40px_1fr] items-start gap-2.5">
        <span className={clsx("text-[22px] leading-none font-extrabold", locked ? "text-sd-n-500" : "text-sd-accent")}>{locked ? <Icon name="lock" /> : pad(n)}</span>
        <div className="flex flex-col">
          <span className="text-[17px] leading-[1.2] font-extrabold">{title}</span>
          <span className="text-xs text-sd-n-700">{locked ? lockedText : sub}</span>
        </div>
      </div>
      {!locked && children && <div className="mt-3.5 lg:pl-[50px]">{children}</div>}
    </section>
  );
}

/** A finished step: what you did, and the way on. */
function Done({ text, next }: { text: string; next?: { label: string; key: StepKey } }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <span className="flex items-center gap-2 text-sm font-extrabold"><span className="flex size-6 items-center justify-center bg-sd-ink text-sd-bg"><Icon name="check" size={14} stroke={3} /></span>{text}</span>
      {next && <button type="button" onClick={() => goTo(next.key, 0)} className="sd-btn sd-btn-secondary h-10 gap-2">{next.label}<Icon name="down" size={16} /></button>}
    </div>
  );
}

function Reveal({ c, ui, pre, read, onRead }: { c: DayCopy; ui: Ui; pre: number[]; read: boolean; onRead: () => void }) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h6 className="sd-h6 mb-2">{ui.yours}</h6>
        <div className="border-t-2 border-sd-divider">
          {c.pre.map((q, k) => {
            const mine = q.choices[pre[k]];
            const best = q.choices.find((x) => x.best)!;
            return (
              <div key={q.id} className="flex flex-col gap-1 border-b border-sd-divider py-3 text-sm">
                <b>{q.prompt}</b>
                <span className={mine?.best ? "text-sd-ink" : "text-sd-accent-700"}>{ui.you}: {mine?.text}</span>
                {!mine?.best && <span className="font-semibold">{ui.best}: {best.text}</span>}
              </div>
            );
          })}
        </div>
      </div>
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
          <h6 className="sd-h6 mb-2">{c.explain.title}</h6>
          <div className="grid gap-2 sm:grid-cols-2">
            {c.explain.items.map((x, i) => (
              <div key={x.term} className={clsx("flex flex-col gap-1.5 p-4", i % 2 ? "bg-sd-surface" : "bg-sd-ink text-sd-bg")}>
                <span className="text-[22px] leading-none font-extrabold tracking-[-0.02em]">{x.term}</span>
                <span className="text-sm leading-[1.45]">{x.what}</span>
                <span className={clsx("text-xs", i % 2 ? "text-sd-n-700" : "text-sd-bg/70")}>e.g. {x.example}</span>
              </div>
            ))}
          </div>
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
        <p className="m-0 mt-2 bg-sd-surface px-3.5 py-3 text-sm font-semibold">{c.concept.rule}</p>
      </div>
      {!read && <button type="button" onClick={onRead} className="sd-btn sd-btn-primary h-12 self-start gap-2">{ui.readDone} · {ui.toNext(ui.steps.prove)}<Icon name="arrowR" size={16} /></button>}
    </div>
  );
}

function Unlocked({ s, act, id, day, c, ui }: { s: CourseState; act: Act; id: string; day: Day; c: DayCopy; ui: Ui }) {
  const [copied, setCopied] = useState(false);
  const p = s.lessons[id] ?? {};
  const image = `/images/system-design/day-${day.day}-linkedin-${s.lang}.png`;
  // LinkedIn's share link prefills the text but can't carry an image, so the text also goes on the clipboard.
  const share = async () => {
    try { await navigator.clipboard.writeText(c.linkedin); setCopied(true); } catch { /* blocked: the prefill still works */ }
    window.open(`https://www.linkedin.com/feed/?shareActive=true&text=${encodeURIComponent(c.linkedin)}`, "_blank", "noopener,noreferrer");
  };
  return (
    <div className="flex flex-col gap-6">
      <div className="sd-a-pop flex items-end justify-between bg-sd-accent p-4 text-sd-bg">
        <div className="flex flex-col"><span className="sd-kicker">Day {day.day} complete</span><span className="text-[22px] font-extrabold tracking-[-0.02em]">{ui.before(score(c.pre, p.pre ?? []), c.pre.length, score(c.post, p.post ?? []), c.post.length)}</span></div>
        <Icon name="flame" size={32} />
      </div>
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
        <div className="flex flex-col gap-2 bg-sd-surface p-4 text-[15px] leading-[1.45]">{c.interview.map((l, i) => <span key={l}><b className="text-sd-accent">{i + 1}.</b> {l}</span>)}</div>
      </div>
      <div>
        <h6 className="sd-h6 mb-1">{ui.share}</h6>
        <span className="mb-3 block text-sm text-sd-n-800">{ui.shareNote}</span>
        {/* eslint-disable-next-line @next/next/no-img-element -- the same file the learner downloads */}
        <img src={image} alt={c.cheatsheet.title} width={1080} height={1350} className="w-full max-w-[420px] border border-sd-divider" />
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <a href={image} download={`klymb-system-design-day-${day.day}.png`} className="sd-btn sd-btn-secondary h-11 gap-2"><Icon name="download" size={16} />{ui.download}</a>
          <button type="button" onClick={share} className="sd-btn sd-btn-primary h-11">{copied ? ui.copied : ui.post}</button>
        </div>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <button type="button" onClick={() => act((q) => completeNext(q, false))} className="sd-btn sd-btn-primary h-12 gap-2"><Icon name="check" size={16} />{ui.complete}</button>
        <button type="button" onClick={() => { act((q) => ({ ...updateLesson(q, id, null), t: 0, playing: false })); goTo("call", 50); }} className="sd-btn sd-btn-ghost h-12">{ui.redo}</button>
      </div>
    </div>
  );
}

/** Under the video: learn → prove it → build it → follow-ups → done. Each opens when the one before is done, and finishing one moves you to the next. */
export function Practice({ s, act, id, day }: { s: CourseState; act: Act; id: string; day: Day }) {
  const ui = UI[s.lang];
  const c = day.copy[s.lang];
  const p: LessonProgress = s.lessons[id] ?? {};
  const set = (patch: Partial<LessonProgress>, next?: StepKey) => { act((q) => updateLesson(q, id, patch)); if (next) goTo(next, 250); };
  const steps = lessonSteps(s, id, day);
  const open = (k: StepKey) => !!steps.find((x) => x.key === k)?.open;
  const num = (k: StepKey) => steps.findIndex((x) => x.key === k) + 1;
  const after = (k: StepKey) => steps[steps.findIndex((x) => x.key === k) + 1]?.key ?? "done";
  const nextOf = (k: StepKey) => { const n = after(k); return { key: n, label: ui.toNext(ui.steps[n]) }; };

  return (
    <div className="mt-6 lg:mt-8">
      {!p.watched && <p className="m-0 mb-1 border-l-[3px] border-sd-accent pl-3 text-sm text-sd-n-800">{ui.watchFirst}</p>}

      <Step id="reveal" n={num("reveal")} title={ui.reveal} sub={c.revealSub} locked={!open("reveal")} lockedText={ui.locked}>
        <Reveal c={c} ui={ui} pre={p.pre ?? []} read={!!p.read || !!p.post} onRead={() => set({ read: true }, "prove")} />
      </Step>

      <Step id="prove" n={num("prove")} title={ui.prove} sub={ui.proveSub} locked={!open("prove")} lockedText={ui.locked}>
        {p.post
          ? <Done text={ui.proved(score(c.post, p.post), c.post.length)} next={nextOf("prove")} />
          : <ChoiceQuiz key={s.lang} questions={c.post} label={ui.prove} lang={s.lang} onDone={(post) => set({ post, read: true }, after("prove"))} />}
      </Step>

      {c.build && (
        <Step id="build" n={num("build")} title={ui.build} sub={c.build.title} locked={!open("build")} lockedText={ui.locked}>
          {p.built !== undefined
            ? <Done text={ui.built(p.built)} next={nextOf("build")} />
            : <DiagramBuilder key={s.lang} task={c.build} lang={s.lang} onDone={(built) => set({ built }, after("build"))} />}
        </Step>
      )}

      {c.followUps?.length ? (
        <Step id="follow" n={num("follow")} title={ui.follow} sub={`${c.followUps.length} “what if” questions`} locked={!open("follow")} lockedText={ui.locked}>
          {p.follow
            ? <Done text={ui.followed(p.follow.filter(Boolean).length, p.follow.length)} next={nextOf("follow")} />
            : <FollowUps key={s.lang} items={c.followUps} lang={s.lang} onDone={(follow) => set({ follow }, "done")} />}
        </Step>
      ) : null}

      <Step id="done" n={num("done")} title={ui.unlocked} sub={c.cheatsheet.title} locked={!open("done")} lockedText={ui.locked}>
        <Unlocked s={s} act={act} id={id} day={day} c={c} ui={ui} />
      </Step>
    </div>
  );
}
