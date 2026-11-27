"use client";

import clsx from "clsx";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState, useTransition } from "react";
import { submitLessonCheck, type CheckResult } from "@/app/org/[slug]/(workspace)/learning/[course]/actions";
import { WorkspacePlayer } from "@/components/company/learn/WorkspacePlayer";
import type { Day, Lang, Question } from "@/data/system-design/types";
import { PASS_MARK, type LessonContent } from "@/lib/course-app";

/**
 * One lesson, inside the workspace (user, 26 Nov). The video and the check
 * share one stage at the top: when the video ends the check takes its place,
 * in the same spot, so nobody scrolls to find it; "Video" and "Lesson check"
 * above the stage switch between them at any time, and the video keeps its
 * place. The check goes one question at a time so it fits on screen. Its
 * answers live on the server and come back, with the reasons, only once an
 * attempt is in. Key ideas and common questions sit below.
 */

const PASS = Math.round(PASS_MARK * 100);
const RED = "var(--color-red-strong)";
type View = "video" | "check";

interface Props {
  slug: string;
  lessonId: string;
  day: Day;
  content: LessonContent;
  email: string;
  name: string | null;
  best: { score: number; attempts: number; passed: boolean } | null;
  /** The course home; lessons are at lessonHrefBase/<id>. */
  courseHref: string;
  lessonHrefBase: string;
}

export function LessonView({ slug, lessonId, day, content, email, name, best, courseHref, lessonHrefBase }: Props) {
  const [lang, setLang] = useState<Lang>("en");
  // The check opens once the video is watched, or straight away on a lesson already passed.
  const [watched, setWatched] = useState(false);
  const [view, setView] = useState<View>("video");
  const stage = useRef<HTMLDivElement>(null);
  const open = watched || !!best?.passed;
  const copy = day.copy[lang];

  const show = useCallback((v: View) => {
    setView(v);
    // Bring the stage's top into view if it isn't: the check appears where the video was.
    const el = stage.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top;
    if (top < 0 || top > window.innerHeight * 0.4) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);
  const onWatched = useCallback(() => setWatched(true), []);
  const onEnded = useCallback(() => {
    setWatched(true);
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    show("check");
  }, [show]);

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <div ref={stage} className="scroll-mt-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div role="tablist" aria-label="Lesson" className="inline-flex rounded-md border border-line/50 bg-white p-0.5 text-sm font-semibold">
            <button type="button" role="tab" aria-selected={view === "video"} onClick={() => show("video")} className={clsx("inline-flex min-h-9 items-center gap-1.5 rounded px-3", view === "video" ? "bg-red-strong text-white" : "text-ink hover:bg-slate-100")}>
              <span aria-hidden="true">▶</span>Video
            </button>
            <button
              type="button" role="tab" aria-selected={view === "check"} disabled={!open} onClick={() => show("check")}
              title={open ? undefined : "Finish the video to open the check"}
              className={clsx("inline-flex min-h-9 items-center gap-1.5 rounded px-3 disabled:cursor-not-allowed disabled:text-muted", view === "check" ? "bg-red-strong text-white" : "text-ink hover:bg-slate-100 disabled:hover:bg-transparent")}
            >
              {open ? (best?.passed ? <span aria-hidden="true">✓</span> : null) : <span aria-hidden="true">🔒</span>}Lesson check
            </button>
          </div>
          <div role="group" aria-label="Text language" className="inline-flex items-center gap-2 text-sm">
            <span className="text-muted">Text</span>
            <span className="inline-flex rounded-md border border-line/50 bg-white p-0.5 font-semibold">
              {(["en", "hi"] as const).map((l) => (
                <button key={l} type="button" aria-pressed={lang === l} onClick={() => setLang(l)} className={clsx("min-h-8 rounded px-2.5", lang === l ? "bg-red-strong text-white" : "text-ink hover:bg-slate-100")}>
                  {l === "en" ? "English" : "Hinglish"}
                </button>
              ))}
            </span>
          </div>
        </div>

        {/* Both stay mounted, so the video keeps its place while the check is up. */}
        <div className={clsx(view !== "video" && "hidden")}>
          <WorkspacePlayer lessonId={lessonId} content={content} email={email} name={name} active={view === "video"} onWatched={onWatched} onEnded={onEnded} />
          {!open && <p className="mt-2 text-sm text-muted">The lesson check ({copy.post.length} questions, {PASS}% to pass) opens here when you finish the video.</p>}
        </div>
        {open && (
          <div className={clsx(view !== "check" && "hidden")}>
            <LessonCheck slug={slug} lessonId={lessonId} questions={copy.post} lang={lang} best={best} courseHref={courseHref} lessonHrefBase={lessonHrefBase} onWatchAgain={() => show("video")} />
          </div>
        )}
      </div>

      <section aria-labelledby="ideas" className="rounded-lg border border-line/30 bg-white p-5">
        <h2 id="ideas" className="text-lg font-bold">Key ideas</h2>
        <p className="mt-3 rounded-md border-l-4 bg-red-tint px-4 py-3 text-sm font-semibold" style={{ borderColor: RED }}>{copy.concept.rule}</p>
        <ul className="mt-4 flex flex-col gap-2 text-sm">
          {copy.cheatsheet.points.map((p) => (
            <li key={p} className="flex gap-2"><span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-red-strong" />{p}</li>
          ))}
        </ul>
        {copy.concept.cards.length > 0 && (
          <details className="mt-4 border-t border-line/25 pt-3 text-sm">
            <summary className="w-fit cursor-pointer font-semibold text-red-strong">More detail</summary>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {copy.concept.cards.map((c) => (
                <div key={c.name} className="rounded-md bg-slate-50 p-4">
                  <p className="font-bold">{c.name}</p>
                  {c.examples.length > 0 && <p className="mt-1 text-muted">{c.examples.join(" · ")}</p>}
                  <ul className="mt-2 list-disc pl-5">{c.moves.map((m) => <li key={m}>{m}</li>)}</ul>
                </div>
              ))}
            </div>
          </details>
        )}
      </section>

      {copy.faq.length > 0 && (
        <section aria-labelledby="faq" className="rounded-lg border border-line/30 bg-white p-5">
          <h2 id="faq" className="text-lg font-bold">Common questions</h2>
          <div className="mt-2 divide-y divide-line/25">
            {copy.faq.map((f) => (
              <details key={f.q} className="py-3 text-sm">
                <summary className="cursor-pointer font-semibold">{f.q}</summary>
                <p className="mt-2 text-muted">{f.a}</p>
              </details>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

const BTN_RED = "inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-red-strong px-4 text-sm font-bold text-white hover:bg-red-press disabled:opacity-50";
const BTN_PLAIN = "inline-flex min-h-10 items-center justify-center rounded-md border border-line/60 bg-white px-4 text-sm font-semibold hover:bg-slate-50 disabled:opacity-40";

/**
 * The lesson check, one question at a time, so it fits where the video was.
 * After an attempt: the score and what to do next, then each question again
 * with the right answer and why, stepped through the same way.
 */
function LessonCheck({ slug, lessonId, questions, lang, best, courseHref, lessonHrefBase, onWatchAgain }: { slug: string; lessonId: string; questions: Question[]; lang: Lang; best: Props["best"]; courseHref: string; lessonHrefBase: string; onWatchAgain: () => void }) {
  const router = useRouter();
  const [picks, setPicks] = useState<(number | null)[]>(() => questions.map(() => null));
  const [idx, setIdx] = useState(0);
  const [result, setResult] = useState<CheckResult | null>(null);
  const [pending, start] = useTransition();
  const done = result?.ok ? result : null;
  const review = done?.review[lang];
  const n = questions.length;
  const q = questions[idx];
  const r = review?.[idx];
  const right = (qi: number) => !!review?.[qi]?.choices[picks[qi] ?? -1]?.best;
  const last = idx === n - 1;

  const submit = () => start(async () => {
    const res = await submitLessonCheck(slug, lessonId, picks);
    setResult(res);
    if (res.ok) { setIdx(0); router.refresh(); }
  });
  const again = () => { setPicks(questions.map(() => null)); setResult(null); setIdx(0); };

  return (
    <section id="check" aria-labelledby="check-title" className="overflow-hidden rounded-lg border border-line/30 bg-white">
      <header className="border-b border-line/25 px-5 py-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="check-title" className="font-bold">{done ? "Your answers" : "Lesson check"} <span className="font-normal text-muted">· {done ? "review" : "question"} {idx + 1} of {n}</span></h2>
          <span className={clsx("text-xs font-semibold", best?.passed ? "text-[#14532d]" : "text-muted")}>
            {best ? `${best.passed ? "Passed" : "Not passed yet"} · best ${best.score}% · ${best.attempts} ${best.attempts === 1 ? "try" : "tries"}` : `${PASS}% to pass · retakes allowed`}
          </span>
        </div>
        {/* One step per question: done ones filled; after an attempt, green for right and red for not. */}
        <div className="mt-2 flex gap-1" aria-hidden="true">
          {questions.map((_, k) => (
            <button key={k} type="button" tabIndex={-1} onClick={() => (done || picks[k] !== null || k <= idx) && setIdx(k)} className={clsx(
              "h-1.5 flex-1 rounded-full",
              done ? (right(k) ? "bg-[#15803d]" : "bg-[#b91c1c]") : k === idx ? "bg-red-strong" : picks[k] !== null ? "bg-red-strong/40" : "bg-slate-200",
              k === idx && done && "ring-2 ring-ink/30 ring-offset-1",
            )} />
          ))}
        </div>
      </header>

      {done && (
        <div role="status" className={clsx("flex flex-wrap items-center gap-3 border-b px-5 py-3", done.passed ? "border-[#cfe6da] bg-[#e4f2ec]" : "border-[#f3d9c4] bg-[#fdf1e7]")}>
          <div className="min-w-[12rem] flex-1">
            <p className="font-bold">{done.passed ? `Passed with ${done.pct}%` : `${done.pct}%: not quite there`}</p>
            <p className="text-sm">{done.passed ? (done.nextId ? "The next lesson is open." : done.finalReady ? "That was the last lesson. The final is open." : "Nice work.") : `You need ${PASS}%. Check the answers below, or watch the video again.`}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {done.passed && done.nextId && <Link href={`${lessonHrefBase}/${done.nextId}`} className={BTN_RED}>Next lesson <span aria-hidden="true">→</span></Link>}
            {done.passed && !done.nextId && done.finalReady && <Link href={`${courseHref}/final`} className={BTN_RED}>Take the final</Link>}
            {!done.passed && <button type="button" onClick={again} className={BTN_RED}>Try again</button>}
            <button type="button" onClick={onWatchAgain} className={BTN_PLAIN}>Watch the video again</button>
          </div>
        </div>
      )}
      {result && !result.ok && <p role="alert" className="border-b border-[#f0c9c9] bg-[#f6e4e4] px-5 py-3 text-sm text-[#7a1f1f]">{result.message}</p>}

      <fieldset key={idx} disabled={!!done || pending} className="px-5 py-4">
        <legend className="sr-only">Question {idx + 1}</legend>
        {q.scenario && <p className="text-sm text-muted">{q.scenario}</p>}
        <p className="mt-1 font-semibold">{q.prompt}</p>
        <div role="radiogroup" className="mt-3 flex flex-col gap-2">
          {q.choices.map((c, ci) => {
            const mine = picks[idx] === ci;
            const isBest = r?.choices[ci]?.best;
            return (
              <label key={ci} className={clsx(
                "flex cursor-pointer items-start gap-3 rounded-md border px-3 py-2.5 text-sm",
                r ? (isBest ? "border-[#15803d] bg-[#e4f2ec]" : mine ? "border-[#b91c1c] bg-[#f6e4e4]" : "border-line/40") : mine ? "border-red-strong bg-red-tint" : "border-line/40 hover:bg-slate-50",
              )}>
                <input type="radio" name={`q-${q.id}`} checked={mine} onChange={() => setPicks((p) => p.map((x, i) => (i === idx ? ci : x)))} className="mt-0.5 size-4 shrink-0 accent-red-strong" />
                <span className="min-w-0">
                  {c.text}
                  {r && (isBest || mine) && r.choices[ci]?.why && <span className="mt-1 block text-muted">{isBest ? "Correct. " : "Not this one. "}{r.choices[ci].why}</span>}
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <footer className="flex items-center justify-between gap-3 border-t border-line/25 px-5 py-3">
        <button type="button" onClick={() => setIdx((k) => k - 1)} disabled={idx === 0} className={BTN_PLAIN}>Back</button>
        {done ? (
          <button type="button" onClick={() => setIdx((k) => k + 1)} disabled={last} className={BTN_PLAIN}>Next answer</button>
        ) : last ? (
          <button type="button" onClick={submit} disabled={picks.some((p) => p === null) || pending} className={BTN_RED}>{pending ? "Checking…" : "Submit answers"}</button>
        ) : (
          <button type="button" onClick={() => setIdx((k) => k + 1)} disabled={picks[idx] === null} className={BTN_RED}>Next <span aria-hidden="true">→</span></button>
        )}
      </footer>
    </section>
  );
}
