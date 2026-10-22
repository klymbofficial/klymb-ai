"use client";

import clsx from "clsx";
import { useState } from "react";
import type { FollowUp, Lang } from "@/data/system-design/types";
import { Icon } from "../icons";

const UI = {
  en: { label: "Interviewer", think: "Think of your answer first. Then check it.", show: "Show model answer", say: "Say this", deeper: "Deeper in", had: "I'd have said this", missed: "I'd have missed this", result: (n: number, of: number) => `You had ${n} of ${of} follow-ups covered.`, next: "Finish the day" },
  hi: { label: "Interviewer", think: "Pehle apna jawab socho. Phir check karo.", show: "Model answer dikhao", say: "Yeh bolo", deeper: "Detail mein", had: "Main yeh bol deta", missed: "Yeh miss ho jaata", result: (n: number, of: number) => `${of} mein se ${n} follow-ups tumhe aate the.`, next: "Day poora karo" },
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
      <div className="sd-a-in flex flex-col gap-3">
        <span className="bg-sd-ink px-3.5 py-3 text-[15px] font-extrabold text-sd-bg">{ui.result(n, items.length)}</span>
        <div className="border-t-2 border-sd-divider">
          {items.map((x, k) => (
            <div key={x.q} className="grid grid-cols-[28px_1fr] items-start gap-2.5 border-b border-sd-divider py-2.5 text-sm">
              <span className={clsx("flex size-6 items-center justify-center border-[1.5px]", marks[k] ? "border-sd-ink bg-sd-ink text-sd-bg" : "border-sd-accent text-sd-accent")}><Icon name={marks[k] ? "check" : "x"} size={14} stroke={3} /></span>
              <span>{x.q}</span>
            </div>
          ))}
        </div>
        <button type="button" onClick={() => onDone(marks)} className="sd-btn sd-btn-primary h-11 self-start gap-2">{ui.next}<Icon name="arrowR" size={16} /></button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="sd-kicker text-sd-accent-700">{ui.label} · {i + 1} / {items.length}</span>
        <span className="flex gap-1" aria-hidden="true">
          {items.map((x, k) => <span key={x.q} className={clsx("h-[5px] w-6", k < i ? "bg-sd-accent" : k === i ? "bg-sd-ink" : "bg-sd-n-300")} />)}
        </span>
      </div>

      <div key={i} className="sd-a-side mt-3 grid grid-cols-[40px_1fr] gap-2.5">
        <span aria-hidden="true" className="flex size-10 items-center justify-center bg-sd-ink text-sd-bg"><Icon name="msg" /></span>
        <p className="m-0 bg-sd-ink px-4 py-3 text-[17px] leading-[1.35] font-extrabold text-sd-bg">{f.q}</p>
      </div>

      {!open ? (
        <div className="mt-4 flex flex-col items-start gap-3">
          <span className="text-sm text-sd-n-800">{ui.think}</span>
          <button type="button" onClick={() => setOpen(true)} className="sd-btn sd-btn-secondary h-11">{ui.show}</button>
        </div>
      ) : (
        <div className="sd-a-in mt-4 flex flex-col gap-3" style={{ animationDuration: ".35s" }}>
          <div className="border-t-2 border-sd-divider">
            {f.answer.map((a, k) => (
              <div key={a} className="grid grid-cols-[32px_1fr] gap-2.5 border-b border-sd-divider py-2.5 text-[15px] leading-[1.45]">
                <span className="font-extrabold text-sd-accent">{String(k + 1).padStart(2, "0")}</span><span>{a}</span>
              </div>
            ))}
          </div>
          <div className="border-l-[3px] border-sd-accent bg-sd-accent-100 px-4 py-3">
            <span className="sd-kicker text-sd-accent-700">{ui.say}</span>
            <p className="m-0 mt-1 text-[15px] font-semibold">{f.say}</p>
          </div>
          {f.deeper && <span className="text-xs text-sd-n-700">{ui.deeper}: {f.deeper}</span>}
          <div className="flex flex-col gap-2 pt-1 sm:flex-row">
            <button type="button" onClick={() => mark(true)} className="sd-btn sd-btn-secondary h-11 justify-start gap-2"><Icon name="check" size={16} />{ui.had}</button>
            <button type="button" onClick={() => mark(false)} className="sd-btn sd-btn-secondary h-11 justify-start gap-2 text-sd-accent-700"><Icon name="x" size={16} />{ui.missed}</button>
          </div>
        </div>
      )}
    </div>
  );
}
