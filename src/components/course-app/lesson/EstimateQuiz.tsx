"use client";

import clsx from "clsx";
import { useState } from "react";
import type { Estimate, Lang } from "@/data/system-design/types";
import { pad } from "@/lib/course-app";
import { Icon } from "../icons";

const UI = {
  en: { given: "Given", check: "Check", next: "Next", done: "Done", placeholder: "Your estimate", right: "Spot on.", high: (x: string) => `Too high, by about ${x}×.`, low: (x: string) => `Too low, by about ${x}×.`, working: "The working", answer: "Answer" },
  hi: { given: "Diya hua", check: "Check karo", next: "Next", done: "Done", placeholder: "Tumhara estimate", right: "Ekdum sahi.", high: (x: string) => `Zyada hai, lagbhag ${x} guna.`, low: (x: string) => `Kam hai, lagbhag ${x} guna.`, working: "Hisaab", answer: "Jawab" },
};

const fmtN = (n: number) => n.toLocaleString("en-IN", { maximumFractionDigits: 2 });

/**
 * Back-of-the-envelope maths, one question at a time: type a number, check it,
 * then read the working. Close enough counts: estimates are about the right
 * order of magnitude, not the last digit.
 */
export function EstimateQuiz({ items, lang, idx, onIdx, onDone }: {
  items: Estimate[]; lang: Lang; idx: number; onIdx: (i: number) => void; onDone: (answers: number[]) => void;
}) {
  const ui = UI[lang];
  const [draft, setDraft] = useState("");
  const [answers, setAnswers] = useState<number[]>([]);
  const i = Math.min(idx, items.length - 1);
  const q = items[i];
  const mine = answers[i];
  const checked = mine !== undefined;
  const last = i === items.length - 1;
  const value = Number(draft.replace(/[,\s]/g, ""));
  const ratio = checked ? mine / q.answer : 1;
  const ok = checked && Math.abs(ratio - 1) <= q.tolerance;

  const check = () => { if (draft.trim() && Number.isFinite(value)) setAnswers((a) => { const n = [...a]; n[i] = value; return n; }); };
  const next = () => { if (last) onDone(answers); else { setDraft(""); onIdx(i + 1); } };

  return (
    <div className="flex flex-1 flex-col">
      <div key={q.id} className="sd-a-side flex flex-col gap-5">
        <div className="flex flex-col gap-2.5 rounded-xl bg-sd-ink px-4 py-3.5 text-sd-bg">
          <span className="text-[11px] font-extrabold tracking-[0.12em] uppercase text-sd-accent-400">{ui.given}</span>
          <ul className="m-0 grid list-none grid-cols-[repeat(auto-fit,minmax(min(100%,220px),1fr))] gap-x-5 gap-y-2 p-0">
            {q.given.map((g) => <li key={g} className="border-t border-white/20 pt-2 text-[15px] leading-[1.4] font-bold text-pretty">{g}</li>)}
          </ul>
        </div>
        <h3 className="m-0 text-[26px] leading-[1.08] tracking-[-0.03em] text-balance lg:text-[34px]">{q.prompt}</h3>
        <label className="flex min-h-[60px] w-full max-w-[360px] items-center gap-2.5 rounded-xl border-2 border-sd-ink bg-white px-4">
          <input
            type="text"
            inputMode="decimal"
            disabled={checked}
            value={checked ? fmtN(mine) : draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !checked) check(); }}
            placeholder={ui.placeholder}
            aria-label={`${q.prompt} (${q.unit})`}
            size={1}
            className="w-0 min-w-0 flex-1 border-0 bg-transparent text-[24px] font-extrabold tracking-[-0.02em] text-sd-ink outline-none placeholder:text-base placeholder:font-semibold placeholder:tracking-normal placeholder:text-sd-n-600"
          />
          <span className="flex-none text-sm font-bold text-sd-n-700">{q.unit}</span>
        </label>
        {checked && (
          <div className="sd-a-in flex flex-col gap-4" style={{ animationDuration: ".3s" }}>
            <div role="status" className={clsx("rounded-xl px-4 py-3.5 text-base leading-[1.4] font-extrabold", ok ? "bg-sd-accent-100 text-sd-ink" : "bg-sd-surface text-sd-accent-700")}>
              {ok ? ui.right : ratio > 1 ? ui.high(fmtN(Math.round(ratio * 10) / 10)) : ui.low(fmtN(Math.round((1 / ratio) * 10) / 10))} {ui.answer}: ≈ {fmtN(q.answer)} {q.unit}
            </div>
            <div>
              <h6 className="sd-h6 mb-2">{ui.working}</h6>
              <ol className="m-0 flex list-none flex-col border-t-2 border-sd-divider p-0">
                {q.working.map((w, k) => (
                  <li key={w} className="grid grid-cols-[28px_1fr] gap-2.5 border-b border-sd-divider py-3 text-[15px] leading-[1.45]">
                    <span className="text-[13px] leading-[1.6] font-extrabold text-sd-accent">{pad(k + 1)}</span><span className="text-pretty">{w}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        )}
      </div>

      <div className="sticky bottom-0 z-[4] -mx-5 mt-auto border-t border-sd-divider bg-sd-bg px-5 pt-2.5 pb-4 shadow-[0_-10px_20px_-14px_rgba(32,30,29,.25)] lg:mx-0 lg:px-10 lg:pt-3.5 lg:pb-[18px]">
        <div className="flex items-center gap-3">
          <span className="flex-1" />
          <button
            type="button"
            onClick={checked ? next : check}
            disabled={!checked && (!draft.trim() || !Number.isFinite(value))}
            className="sd-btn sd-btn-primary h-[52px] flex-1 max-w-[280px] justify-between rounded-[10px] px-[18px] text-base"
          >
            {checked ? (last ? ui.done : ui.next) : ui.check}<Icon name="arrowR" size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
