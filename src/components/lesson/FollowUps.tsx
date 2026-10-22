"use client";

import clsx from "clsx";
import { useState } from "react";
import type { FollowUp, Lang } from "@/data/system-design/types";

const UI = {
  en: { label: "Interviewer", think: "Think of your answer first. Then check it.", show: "Show model answer", say: "Say this", deeper: "Deeper in", had: "I'd have said this", missed: "I'd have missed this", result: (n: number, of: number) => `You had ${n} of ${of} follow-ups covered.`, next: "Finish the day →" },
  hi: { label: "Interviewer", think: "Pehle apna jawab socho. Phir check karo.", show: "Model answer dikhao", say: "Yeh bolo", deeper: "Detail mein", had: "Main yeh bol deta", missed: "Yeh miss ho jaata", result: (n: number, of: number) => `${of} mein se ${n} follow-ups tumhe aate the.`, next: "Day poora karo →" },
};

/**
 * The "what if" questions real interviewers push with after your first answer.
 * One at a time: think, reveal the model answer, then mark honestly whether
 * you'd have said it. The marks are the learner's own weak-spot list.
 */
export function FollowUps({ items, lang, onDone }: { items: FollowUp[]; lang: Lang; onDone: (marks: boolean[]) => void }) {
  const ui = UI[lang];
  const [i, setI] = useState(0);
  const [open, setOpen] = useState(false);
  const [marks, setMarks] = useState<boolean[]>([]);
  const f = items[i];
  const finished = marks.length === items.length;

  const mark = (had: boolean) => {
    const next = [...marks, had];
    setMarks(next);
    if (i < items.length - 1) { setI(i + 1); setOpen(false); }
  };

  if (finished) {
    const n = marks.filter(Boolean).length;
    return (
      <div className="space-y-3">
        <p className="rounded-lg bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">✓ {ui.result(n, items.length)}</p>
        <ul className="space-y-1.5 text-sm">
          {items.map((x, k) => (
            <li key={x.q} className="flex gap-2"><span className={marks[k] ? "text-emerald-700" : "text-red-deep"}>{marks[k] ? "✓" : "✕"}</span><span>{x.q}</span></li>
          ))}
        </ul>
        <button type="button" onClick={() => onDone(marks)} className="rounded-lg bg-red-strong px-5 py-3 text-sm font-extrabold text-white transition-transform active:scale-[0.97]">{ui.next}</button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between text-xs font-bold text-muted">
        <span>{ui.label} · {i + 1} / {items.length}</span>
        <span className="flex gap-1" aria-hidden="true">
          {items.map((x, k) => <span key={x.q} className={clsx("h-1.5 w-6 rounded-full", k < i ? "bg-red-strong" : k === i ? "bg-ink/60" : "bg-line/30")} />)}
        </span>
      </div>

      <div className="mt-4 flex gap-3">
        <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-full bg-night text-lg">🧑‍💼</span>
        <p className="rounded-2xl rounded-tl-sm bg-night px-4 py-3 text-[15px] font-bold leading-snug text-white">{f.q}</p>
      </div>

      {!open ? (
        <div className="mt-4">
          <p className="text-sm text-muted">{ui.think}</p>
          <button type="button" onClick={() => setOpen(true)} className="mt-3 rounded-lg bg-ink px-5 py-3 text-sm font-bold text-paper transition-transform active:scale-[0.97]">{ui.show}</button>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          <ul className="space-y-2 text-[15px] leading-snug">
            {f.answer.map((a, k) => (
              <li key={a} className="flex gap-3"><span className="font-mono text-xs font-bold text-red-deep">{String(k + 1).padStart(2, "0")}</span>{a}</li>
            ))}
          </ul>
          <div className="rounded-xl border-l-4 border-red-strong bg-red-tint px-4 py-3">
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-red-deep">{ui.say}</p>
            <p className="mt-1 text-[15px] font-semibold italic">{f.say}</p>
          </div>
          {f.deeper && <p className="text-xs text-muted">{ui.deeper}: {f.deeper}</p>}
          <div className="flex flex-col gap-2 pt-1 sm:flex-row">
            <button type="button" onClick={() => mark(true)} className="rounded-lg border-2 border-emerald-600 px-4 py-2.5 text-sm font-bold text-emerald-800 transition-transform active:scale-[0.97]">✓ {ui.had}</button>
            <button type="button" onClick={() => mark(false)} className="rounded-lg border-2 border-red-strong px-4 py-2.5 text-sm font-bold text-red-deep transition-transform active:scale-[0.97]">✕ {ui.missed}</button>
          </div>
        </div>
      )}
    </div>
  );
}
