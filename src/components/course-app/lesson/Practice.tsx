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
    yourCall: "Your call", yourCallSub: "Answer first. The video unlocks after.",
    practice: "Practice", locked: "Finish the step before",
    reveal: "What really happens", build: "Build it yourself", prove: "Prove it", follow: "Interviewer follow-ups", unlocked: "Unlocked",
    proveSub: "New scenario, same idea", yours: "Your answer vs the best move", you: "You", best: "Best", concept: "Today’s idea",
    watchFirst: "Watch the video to unlock the practice.", toProve: "Now prove it",
    built: (n: number) => (n === 0 ? "Built on the first try." : `Built, with ${n} wrong ${n === 1 ? "drop" : "drops"} on the way.`),
    followed: (n: number, of: number) => `You had ${n} of ${of} follow-ups covered.`,
    before: (a: number, b: number) => `Before ${a}/3 → after ${b}/3`,
    cheatsheet: "Cheatsheet", interview: "Say it in 2 minutes", share: "Share on LinkedIn",
    shareNote: "Download the image, then post. The text is copied for you: paste it, attach the image, done.",
    download: "Download image", post: "Copy text and open LinkedIn", copied: "Copied. Paste it in LinkedIn",
    complete: "Mark complete", redo: "Do this lesson again",
  },
  hi: {
    yourCall: "Your call", yourCallSub: "Pehle tum batao. Video uske baad.",
    practice: "Practice", locked: "Pichla step poora karo",
    reveal: "Asal mein kya hota hai", build: "Khud banao", prove: "Prove it", follow: "Interviewer follow-ups", unlocked: "Unlocked",
    proveSub: "Naya scenario, wahi idea", yours: "Tumhara answer vs best move", you: "Tum", best: "Best", concept: "Aaj ka idea",
    watchFirst: "Practice khulegi video dekhne ke baad.", toProve: "Ab prove karo",
    built: (n: number) => (n === 0 ? "Pehli baar mein ban gaya." : `Ban gaya, raaste mein ${n} galat drop.`),
    followed: (n: number, of: number) => `${of} mein se ${n} follow-ups aate the.`,
    before: (a: number, b: number) => `Pehle ${a}/3 → ab ${b}/3`,
    cheatsheet: "Cheatsheet", interview: "2 minute mein aise bolo", share: "LinkedIn par share karo",
    shareNote: "Image download karo, phir post karo. Text copy ho jayega: paste karo, image lagao, ho gaya.",
    download: "Image download karo", post: "Text copy karo, LinkedIn kholo", copied: "Copied. LinkedIn mein paste karo",
    complete: "Mark complete", redo: "Yeh lesson phir se karo",
  },
};

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

/** Before the video: the day's opening scenarios, in place of the player. */
export function YourCall({ s, act, id, day }: { s: CourseState; act: Act; id: string; day: Day }) {
  const ui = UI[s.lang];
  const c = day.copy[s.lang];
  return (
    <div className="sd-a-in flex flex-col gap-4 bg-sd-surface p-4 lg:p-6">
      <div>
        <span className="sd-kicker text-sd-accent-700">{c.tag ?? "Interview question"} · Day {day.day}</span>
        <h2 className="m-0 mt-1.5 text-[26px] leading-[1.05] tracking-[-0.03em] text-pretty lg:text-[36px]">{c.question}</h2>
        <div className="mt-2 flex flex-col gap-0.5 text-[15px] text-sd-n-800">{c.hookLines.map((l) => <span key={l}>{l}</span>)}</div>
      </div>
      <ChoiceQuiz key={s.lang} questions={c.pre} label={ui.yourCall} lang={s.lang} onDone={(pre) => act((p) => updateLesson(p, id, { pre }))} />
    </div>
  );
}

function Step({ n, title, sub, locked, lockedText, children }: { n: number; title: string; sub?: string; locked: boolean; lockedText: string; children?: ReactNode }) {
  return (
    <section className={clsx("border-b border-sd-divider py-4", locked && "opacity-55")} aria-label={title}>
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

function Done({ text }: { text: string }) {
  return <span className="flex items-center gap-2 text-sm font-extrabold"><span className="flex size-6 items-center justify-center bg-sd-ink text-sd-bg"><Icon name="check" size={14} stroke={3} /></span>{text}</span>;
}

function Reveal({ c, ui, pre }: { c: DayCopy; ui: (typeof UI)["en"]; pre: number[] }) {
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
            <div key={r.what} className="sd-a-in grid grid-cols-[132px_1fr] gap-3 border-b border-sd-divider py-2.5 text-sm max-sm:grid-cols-1 max-sm:gap-0.5" style={stagger(i, 50, 0)}>
              <span className="font-extrabold text-sd-accent-700">{r.when}</span>
              <span className="leading-[1.45]">{r.what}</span>
            </div>
          ))}
        </div>
        {c.sourceNote && <span className="mt-2 block text-xs text-sd-n-700">{c.sourceNote}</span>}
      </div>
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
    </div>
  );
}

function Unlocked({ s, act, id, day, c, ui }: { s: CourseState; act: Act; id: string; day: Day; c: DayCopy; ui: (typeof UI)["en"] }) {
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
        <div className="flex flex-col"><span className="sd-kicker">Day {day.day} complete</span><span className="text-[26px] font-extrabold tracking-[-0.02em]">{ui.before(score(c.pre, p.pre ?? []), score(c.post, p.post ?? []))}</span></div>
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
        <button type="button" onClick={() => act((q) => ({ ...updateLesson(q, id, null), t: 0, playing: false }))} className="sd-btn sd-btn-ghost h-12">{ui.redo}</button>
      </div>
    </div>
  );
}

/** Under the video: reveal → build it → prove it → follow-ups → unlocked. Each opens when the one before is done. */
export function Practice({ s, act, id, day }: { s: CourseState; act: Act; id: string; day: Day }) {
  const ui = UI[s.lang];
  const c = day.copy[s.lang];
  const p: LessonProgress = s.lessons[id] ?? {};
  const set = (patch: Partial<LessonProgress>) => act((q) => updateLesson(q, id, patch));
  const watched = !!p.watched;
  const builtOk = !c.build || p.built !== undefined;
  const steps: { key: string; title: string; sub?: string; locked: boolean; body: ReactNode }[] = [
    { key: "reveal", title: ui.reveal, sub: c.revealSub, locked: !watched, body: <Reveal c={c} ui={ui} pre={p.pre ?? []} /> },
  ];
  if (c.build) {
    steps.push({
      key: "build", title: ui.build, sub: c.build.title, locked: !watched,
      body: p.built !== undefined ? <Done text={ui.built(p.built)} /> : <DiagramBuilder key={s.lang} task={c.build} lang={s.lang} onDone={(built) => set({ built })} />,
    });
  }
  steps.push({
    key: "prove", title: ui.prove, sub: ui.proveSub, locked: !watched || !builtOk,
    body: p.post ? <Done text={ui.before(score(c.pre, p.pre ?? []), score(c.post, p.post))} /> : <ChoiceQuiz key={s.lang} questions={c.post} label={ui.prove} lang={s.lang} onDone={(post) => set({ post })} />,
  });
  if (c.followUps?.length) {
    steps.push({
      key: "follow", title: ui.follow, sub: `${c.followUps.length} “what if” questions`, locked: !p.post,
      body: p.follow ? <Done text={ui.followed(p.follow.filter(Boolean).length, p.follow.length)} /> : <FollowUps key={s.lang} items={c.followUps} lang={s.lang} onDone={(follow) => set({ follow })} />,
    });
  }
  const done = flowDone(s, id);
  steps.push({ key: "unlocked", title: ui.unlocked, sub: c.cheatsheet.title, locked: !done, body: <Unlocked s={s} act={act} id={id} day={day} c={c} ui={ui} /> });

  return (
    <div className="mt-6 lg:mt-8">
      <div className="flex items-center justify-between border-b-2 border-sd-divider pb-2">
        <h6 className="sd-h6 m-0">{ui.practice}</h6>
        {!watched && <span className="text-xs text-sd-n-700">{ui.watchFirst}</span>}
      </div>
      {steps.map((st, i) => (
        <Step key={st.key} n={i + 1} title={st.title} sub={st.sub} locked={st.locked} lockedText={ui.locked}>{st.body}</Step>
      ))}
    </div>
  );
}
