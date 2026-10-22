"use client";

import clsx from "clsx";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Celebrate } from "@/components/learner/Celebrate";
import { LessonQuiz, score } from "@/components/lesson/LessonQuiz";
import type { Day, DayCopy, Lang } from "@/data/system-design/types";

interface Progress { pre?: number[]; watched?: boolean; post?: number[] }

const UI = {
  en: {
    steps: ["Your call", "Watch", "What really happens", "Prove it", "Unlocked"],
    interview: "Interview question",
    start: "You answer first →",
    startNote: "Video comes after. Your answer comes first.",
    s1: "Your call", s1Sub: "2 min · 3 scenarios",
    preDone: (n: number) => `You picked ${n}/3 best moves. Now see what Flipkart actually did.`,
    s2: "Watch the story", s2Sub: (m: number, l: string) => `~${m} min · voiced in ${l}`,
    watched: "Watched it → reveal", watchHint: "Finish the video to unlock the reveal",
    s3: "What really happens",
    yoursVsBest: "Your answer vs the best move", you: "You", best: "Best",
    concept: "Today's concept", proveCta: "Now prove it: a new scenario →",
    s4: "Prove it", s4Sub: "new scenario, same concept",
    s5: (n: number) => `Day ${n} complete`, s5Sub: "cheatsheet · interview mode · share",
    locked: "Finish the previous step",
    streak: "Streak: 1 day",
    interviewMode: "Interview mode · 2 min answer",
    share: "Share on LinkedIn",
    shareNote: "Download the infographic, then post. The text is copied for you: paste it, attach the image, done.",
    download: "Download infographic", post: "Copy text & open LinkedIn", copied: "Copied ✓ Paste it in LinkedIn",
    next: (n: number) => `Next · Day ${n}`, open: "Open →", redo: (n: number) => `Do Day ${n} again`, sources: "Sources",
    newHere: "New to system design? Start with Day 0 →",
  },
  hi: {
    steps: ["Your call", "Watch", "What really happens", "Prove it", "Unlocked"],
    interview: "Interview question",
    start: "Pehle tum batao →",
    startNote: "Video baad mein. Pehle tumhara answer.",
    s1: "Your call", s1Sub: "2 min · 3 scenarios",
    preDone: (n: number) => `Tumne ${n}/3 best moves pakde. Ab dekho Flipkart ne asal mein kya kiya.`,
    s2: "Story dekho", s2Sub: (m: number, l: string) => `~${m} min · ${l}`,
    watched: "Dekh liya → reveal", watchHint: "Video poora dekho, reveal khul jayega",
    s3: "Asal mein kya hua",
    yoursVsBest: "Tumhara answer vs best move", you: "Tum", best: "Best",
    concept: "Aaj ka concept", proveCta: "Ab prove karo: naya scenario →",
    s4: "Prove it", s4Sub: "naya scenario, wahi concept",
    s5: (n: number) => `Day ${n} complete`, s5Sub: "cheatsheet · interview mode · share",
    locked: "Pichla step poora karo",
    streak: "Streak: 1 day",
    interviewMode: "Interview mode · 2 min answer",
    share: "LinkedIn par share karo",
    shareNote: "Infographic download karo, phir post karo. Text copy ho jayega: paste karo, image lagao, ho gaya.",
    download: "Infographic download karo", post: "Text copy karo & LinkedIn kholo", copied: "Copied ✓ LinkedIn mein paste karo",
    next: (n: number) => `Agla · Day ${n}`, open: "Kholo →", redo: (n: number) => `Day ${n} phir se karo`, sources: "Sources",
    newHere: "System design mein naye ho? Day 0 se shuru karo →",
  },
};
type Ui = (typeof UI)["en"];

/** Progress and language live in this browser only; a lost save just means starting the day again. */
function load<T>(key: string, fallback: T): T {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
}
function save(key: string, v: unknown) {
  try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* private mode */ }
}

export function DayLesson({ day }: { day: Day }) {
  const key = `klymb-sd-day-${day.day}`;
  const [p, setP] = useState<Progress>({});
  const [lang, setLang] = useState<Lang>("en");
  const [burst, setBurst] = useState(0);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage is only readable after hydration
    setP(load(key, {}));
    const l = load<Lang>("klymb-lang", "en");
    if (l === "en" || l === "hi") setLang(l);
  }, [key]);
  const update = (next: Progress) => { setP(next); save(key, next); };
  const pick = (l: Lang) => { setLang(l); save("klymb-lang", l); };

  const c = day.copy[lang];
  const ui = UI[lang];
  const step = !p.pre ? 0 : !p.watched ? 1 : !p.post ? 3 : 4;
  const preScore = p.pre ? score(c.pre, p.pre) : 0;
  const postScore = p.post ? score(c.post, p.post) : 0;

  const refs = useRef<(HTMLElement | null)[]>([]);
  const go = (s: number) => requestAnimationFrame(() => refs.current[s]?.scrollIntoView({ behavior: "smooth", block: "start" }));

  return (
    <div className="mx-auto max-w-2xl px-4 pb-24 sm:px-6">
      <div className="mt-4 flex justify-end">
        <LangToggle lang={lang} onPick={pick} />
      </div>
      <Hook day={day} c={c} ui={ui} onStart={() => go(0)} />

      <nav aria-label="Today's steps" className="sticky top-20 z-20 -mx-4 mt-6 bg-paper/90 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        <ol className="flex gap-1.5">
          {ui.steps.map((s, k) => (
            <li key={s} className="flex-1">
              <span className={clsx("block h-1.5 rounded-full transition-colors duration-500", k < step || step === 4 ? "bg-red-strong" : k === step ? "bg-ink/60" : "bg-line/25")} />
              <span className={clsx("mt-1.5 hidden text-[11px] font-bold sm:block", k <= step ? "text-ink" : "text-muted/70")}>{s}</span>
            </li>
          ))}
        </ol>
      </nav>

      {/* 1. Your call */}
      <Step n={1} title={ui.s1} sub={ui.s1Sub} lockedText={ui.locked} open locked={false} innerRef={(el) => { refs.current[0] = el; }}>
        {p.pre ? (
          <Done text={ui.preDone(preScore)} />
        ) : (
          <LessonQuiz key={lang} questions={c.pre} label={ui.s1} lang={lang} onDone={(pre) => { update({ ...p, pre }); go(1); }} />
        )}
      </Step>

      {/* 2. Watch */}
      <Step n={2} title={ui.s2} sub={ui.s2Sub(day.video.minutes, day.video.lang)} lockedText={ui.locked} open={!!p.pre} locked={!p.pre} innerRef={(el) => { refs.current[1] = el; }}>
        <Video day={day} ui={ui} watched={!!p.watched} onWatched={() => { update({ ...p, watched: true }); go(2); }} />
      </Step>

      {/* 3. Reveal */}
      <Step n={3} title={ui.s3} sub={c.revealSub} lockedText={ui.locked} open={!!p.watched} locked={!p.watched} innerRef={(el) => { refs.current[2] = el; }}>
        <Reveal c={c} ui={ui} pre={p.pre ?? []} onNext={() => go(3)} />
      </Step>

      {/* 4. Post */}
      <Step n={4} title={ui.s4} sub={ui.s4Sub} lockedText={ui.locked} open={!!p.watched} locked={!p.watched} innerRef={(el) => { refs.current[3] = el; }}>
        {p.post ? (
          <Done text={`Before: ${preScore}/3 → After: ${postScore}/3.`} />
        ) : (
          <LessonQuiz key={lang} questions={c.post} label={ui.s4} lang={lang} onDone={(post) => { update({ ...p, post }); setBurst((b) => b + 1); go(4); }} />
        )}
      </Step>

      {/* 5. Unlocked */}
      <Step n={5} title={ui.s5(day.day)} sub={ui.s5Sub} lockedText={ui.locked} open={!!p.post} locked={!p.post} innerRef={(el) => { refs.current[4] = el; }}>
        <Unlocked day={day} c={c} ui={ui} lang={lang} preScore={preScore} postScore={postScore} burst={burst} onReset={() => { update({}); go(0); }} />
      </Step>

      <Sources day={day} ui={ui} />
    </div>
  );
}

function LangToggle({ lang, onPick }: { lang: Lang; onPick: (l: Lang) => void }) {
  return (
    <div role="radiogroup" aria-label="Language" className="inline-flex rounded-full bg-surface p-1 text-xs font-extrabold">
      {([["en", "English"], ["hi", "Hinglish"]] as const).map(([l, name]) => (
        <button
          key={l}
          type="button"
          role="radio"
          aria-checked={lang === l}
          onClick={() => onPick(l)}
          className={clsx("rounded-full px-3.5 py-1.5 transition-colors", lang === l ? "bg-ink text-paper" : "text-muted hover:text-ink")}
        >
          {name}
        </button>
      ))}
    </div>
  );
}

function Hook({ day, c, ui, onStart }: { day: Day; c: DayCopy; ui: Ui; onStart: () => void }) {
  return (
    <section className="relative mt-3 overflow-hidden rounded-slab bg-night px-6 pt-7 pb-8 text-white shadow-float sm:px-10 sm:pt-10 sm:pb-11">
      <div aria-hidden="true" className="pointer-events-none absolute -top-24 -right-20 size-72 rounded-full bg-red-strong/25 blur-3xl" />
      <div className="relative">
        <p className="flex flex-wrap items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.14em]">
          <span className="rounded-full bg-white/10 px-2.5 py-1">Day {day.day} / {day.of}</span>
          <span className="rounded-full bg-red-strong px-2.5 py-1">{c.tag ?? ui.interview}</span>
          <span className="text-white/60">{day.app} · {day.minutes} min</span>
        </p>
        <p className="mt-7 font-mono text-sm text-red-soft">{day.hook.date}</p>
        <div className="mt-2 space-y-1.5">
          {c.hookLines.map((l, k) => (
            <p key={l} className={clsx("appear text-lg leading-snug sm:text-xl", k === 0 ? "font-extrabold" : "text-white/80")} style={{ "--appear-delay": `${0.15 + k * 0.25}s` } as React.CSSProperties}>{l}</p>
          ))}
        </div>
        {day.hook.quote && (
          <blockquote className="mt-6 border-l-2 border-red-soft pl-4 text-white/85">
            <p className="italic">&ldquo;{day.hook.quote}&rdquo;</p>
            <footer className="mt-1 text-xs text-white/55">{day.hook.quoteBy}</footer>
          </blockquote>
        )}
        <h1 className="display mt-8 text-[clamp(2rem,7.5vw,3.25rem)] text-balance">{c.question}</h1>
        <button type="button" onClick={onStart} className="mt-7 inline-flex items-center gap-2 rounded-lg bg-white px-5 py-3.5 text-sm font-extrabold text-ink transition-transform active:scale-[0.97]">
          {ui.start}
        </button>
        <p className="mt-3 text-xs text-white/50">{ui.startNote}</p>
        {day.prevHref && (
          <Link href={day.prevHref} className="mt-5 inline-block text-sm font-bold text-red-soft underline underline-offset-4">{ui.newHere}</Link>
        )}
      </div>
    </section>
  );
}

function Step({
  n, title, sub, lockedText, open, locked, innerRef, children,
}: { n: number; title: string; sub: string; lockedText: string; open: boolean; locked: boolean; innerRef: (el: HTMLElement | null) => void; children: React.ReactNode }) {
  return (
    <section ref={innerRef} aria-labelledby={`step-${n}`} className={clsx("card mt-5 scroll-mt-36 p-5 transition-opacity sm:p-7", locked && "opacity-60")}>
      <header className="flex items-center gap-3">
        <span className={clsx("grid size-8 shrink-0 place-items-center rounded-full text-sm font-extrabold", locked ? "bg-surface text-muted" : "bg-red-strong text-white")}>
          {locked ? <LockIcon /> : n}
        </span>
        <div>
          <h2 id={`step-${n}`} className="text-lg font-extrabold leading-tight">{title}</h2>
          <p className="text-xs font-semibold text-muted">{locked ? lockedText : sub}</p>
        </div>
      </header>
      {open && !locked && <div className="mt-5">{children}</div>}
    </section>
  );
}

function Done({ text }: { text: string }) {
  return <p className="rounded-lg bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">✓ {text}</p>;
}

function Video({ day, ui, watched, onWatched }: { day: Day; ui: Ui; watched: boolean; onWatched: () => void }) {
  const [pct, setPct] = useState(0);
  const [failed, setFailed] = useState(false);
  const ready = watched || failed || pct >= 0.85;
  return (
    <div>
      <div className="mx-auto aspect-[9/16] w-full max-w-[340px] overflow-hidden rounded-2xl bg-night shadow-float">
        <video
          src={day.video.src}
          poster={day.video.poster}
          controls
          playsInline
          preload="metadata"
          controlsList="nodownload"
          onContextMenu={(e) => e.preventDefault()}
          onTimeUpdate={(e) => { const v = e.currentTarget; if (v.duration) setPct(Math.max(pct, v.currentTime / v.duration)); }}
          onEnded={() => { if (!watched) onWatched(); }}
          onError={() => setFailed(true)}
          className="size-full object-cover"
        />
      </div>
      {!watched && (
        <div className="mt-4 text-center">
          <button type="button" disabled={!ready} onClick={onWatched} className="rounded-lg bg-ink px-5 py-3 text-sm font-bold text-paper transition-transform active:scale-[0.97] disabled:opacity-40">
            {ui.watched}
          </button>
          {!ready && <p className="mt-2 text-xs text-muted">{ui.watchHint}</p>}
        </div>
      )}
    </div>
  );
}

function Reveal({ c, ui, pre, onNext }: { c: DayCopy; ui: Ui; pre: number[]; onNext: () => void }) {
  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-sm font-extrabold uppercase tracking-wider text-muted">{ui.yoursVsBest}</h3>
        <ul className="mt-3 space-y-2.5">
          {c.pre.map((q, k) => {
            const mine = q.choices[pre[k]];
            const best = q.choices.find((x) => x.best)!;
            return (
              <li key={q.id} className="rounded-xl border border-line/20 p-4 text-sm">
                <p className="font-bold">{q.prompt}</p>
                <p className={clsx("mt-2", mine?.best ? "text-emerald-700" : "text-red-deep")}>{ui.you}: {mine?.text}</p>
                {!mine?.best && <p className="mt-1 text-emerald-700">{ui.best}: {best.text}</p>}
              </li>
            );
          })}
        </ul>
      </div>

      <div>
        <h3 className="text-sm font-extrabold uppercase tracking-wider text-muted">{c.revealTitle}</h3>
        <ol className="relative mt-4 space-y-4 border-l-2 border-red-strong/30 pl-5">
          {c.reveal.map((r) => (
            <li key={r.what} className="relative">
              <span aria-hidden="true" className="absolute top-1.5 -left-[27px] size-3 rounded-full border-2 border-paper bg-red-strong" />
              <p className="text-xs font-extrabold text-red-deep">{r.when}</p>
              <p className="mt-0.5 text-[15px] leading-snug">{r.what}</p>
            </li>
          ))}
        </ol>
        {c.sourceNote && <p className="mt-3 text-xs text-muted">{c.sourceNote}</p>}
      </div>

      <div>
        <h3 className="text-sm font-extrabold uppercase tracking-wider text-muted">{ui.concept}</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {c.concept.cards.map((x, k) => (
            <div key={x.name} className={clsx("rounded-xl p-4", k === 0 ? "bg-night text-white" : "bg-red-tint")}>
              <p className="text-lg font-extrabold">{x.name}</p>
              <p className={clsx("mt-1 text-xs", k === 0 ? "text-white/60" : "text-muted")}>{x.examples.join(" · ")}</p>
              <ul className="mt-3 space-y-1.5 text-sm">
                {x.moves.map((m) => <li key={m}>→ {m}</li>)}
              </ul>
            </div>
          ))}
        </div>
        <p className="mt-3 rounded-lg bg-surface/70 px-4 py-3 text-sm font-semibold">{c.concept.rule}</p>
      </div>

      <button type="button" onClick={onNext} className="w-full rounded-lg bg-red-strong px-5 py-3.5 text-sm font-extrabold text-white transition-transform active:scale-[0.98]">
        {ui.proveCta}
      </button>
    </div>
  );
}

function Unlocked({
  day, c, ui, lang, preScore, postScore, burst, onReset,
}: { day: Day; c: DayCopy; ui: Ui; lang: Lang; preScore: number; postScore: number; burst: number; onReset: () => void }) {
  const [copied, setCopied] = useState(false);
  const image = `/images/system-design/day-${day.day}-linkedin-${lang}.png`;

  // LinkedIn's share link can prefill the text but can't carry an image, so the
  // text also goes on the clipboard and the learner attaches the downloaded image.
  const share = async () => {
    try { await navigator.clipboard.writeText(c.linkedin); setCopied(true); } catch { /* clipboard blocked: the prefill still works */ }
    window.open(`https://www.linkedin.com/feed/?shareActive=true&text=${encodeURIComponent(c.linkedin)}`, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="space-y-6">
      <div className="relative rounded-2xl bg-night p-6 text-center text-white">
        <Celebrate burstKey={burst} />
        <p className="text-4xl" aria-hidden="true">🔥</p>
        <p className="mt-2 text-2xl font-extrabold">{ui.streak}</p>
        <p className="mt-1 text-sm text-white/70">Before {preScore}/3 → After {postScore}/3</p>
      </div>

      <div className="rounded-2xl border-2 border-ink p-5">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-red-deep">Cheatsheet</p>
        <p className="mt-1 text-lg font-extrabold">{c.cheatsheet.title}</p>
        <ul className="mt-3 space-y-2 text-[15px]">
          {c.cheatsheet.points.map((pt, k) => (
            <li key={pt} className="flex gap-3"><span className="font-mono text-xs font-bold text-red-deep">{String(k + 1).padStart(2, "0")}</span>{pt}</li>
          ))}
        </ul>
      </div>

      <div>
        <p className="text-sm font-extrabold uppercase tracking-wider text-muted">{ui.interviewMode}</p>
        <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-[15px]">
          {c.interview.map((l) => <li key={l}>{l}</li>)}
        </ol>
      </div>

      <div>
        <p className="text-sm font-extrabold uppercase tracking-wider text-muted">{ui.share}</p>
        <p className="mt-1 text-sm text-muted">{ui.shareNote}</p>
        {/* eslint-disable-next-line @next/next/no-img-element -- the same file the learner downloads */}
        <img src={image} alt={c.cheatsheet.title} width={1080} height={1350} className="mt-3 w-full rounded-xl shadow-card" />
        <pre className="mt-3 whitespace-pre-wrap rounded-xl bg-surface/70 p-4 font-sans text-sm leading-relaxed">{c.linkedin}</pre>
        <div className="mt-3 flex flex-col gap-2.5 sm:flex-row">
          <a href={image} download={`klymb-system-design-day-${day.day}.png`} className="rounded-lg border-2 border-ink px-5 py-3 text-center text-sm font-bold transition-transform active:scale-[0.97]">
            {ui.download}
          </a>
          <button type="button" onClick={share} className="rounded-lg bg-[#0a66c2] px-5 py-3 text-sm font-bold text-white transition-transform active:scale-[0.97]">
            {copied ? ui.copied : ui.post}
          </button>
        </div>
      </div>

      {day.nextHref ? (
        <Link href={day.nextHref} className="block rounded-xl bg-night p-5 text-white transition-transform active:scale-[0.99]">
          <p className="text-xs font-extrabold uppercase tracking-wider text-red-soft">{ui.next(day.day + 1)}</p>
          <p className="mt-1 text-lg font-extrabold">{c.nextDay}</p>
          <p className="mt-3 text-sm font-bold">{ui.open}</p>
        </Link>
      ) : (
        <div className="rounded-xl border border-dashed border-line/50 p-4">
          <p className="text-xs font-extrabold uppercase tracking-wider text-muted">{ui.next(day.day + 1)} <LockIcon /></p>
          <p className="mt-1 font-extrabold">{c.nextDay}</p>
        </div>
      )}

      <button type="button" onClick={onReset} className="text-xs font-semibold text-muted underline underline-offset-4">{ui.redo(day.day)}</button>
    </div>
  );
}

function Sources({ day, ui }: { day: Day; ui: Ui }) {
  if (!day.sources.length) return null;
  return (
    <section aria-label={ui.sources} className="mt-8 px-1 text-xs text-muted">
      <p className="font-bold">{ui.sources}</p>
      <ul className="mt-1.5 space-y-1">
        {day.sources.map((s) => (
          <li key={s.href}><a href={s.href} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-ink">{s.label}</a></li>
        ))}
      </ul>
    </section>
  );
}

function LockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true" className="inline-block align-[-2px]">
      <rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}
