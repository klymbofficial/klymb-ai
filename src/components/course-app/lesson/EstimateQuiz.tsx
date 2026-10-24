"use client";

import clsx from "clsx";
import { useState } from "react";
import type { Estimate, Lang } from "@/data/system-design/types";
import { Icon } from "../icons";

const UI = {
  en: { label: "Estimate it", check: "Check", next: "Next", done: "Done", placeholder: "Your estimate", right: "Spot on.", high: (x: string) => `Too high, by about ${x}×.`, low: (x: string) => `Too low, by about ${x}×.`, working: "The working", answer: "Answer" },
  hi: { label: "Estimate it", check: "Check karo", next: "Next", done: "Done", placeholder: "Tumhara estimate", right: "Ekdum sahi.", high: (x: string) => `Zyada hai, lagbhag ${x} guna.`, low: (x: string) => `Kam hai, lagbhag ${x} guna.`, working: "Hisaab", answer: "Jawab" },
};

const fmtN = (n: number) => n.toLocaleString("en-IN", { maximumFractionDigits: 2 });

/**
 * Back-of-the-envelope maths, one question at a time: type a number, check it,
 * then read the working. Close enough counts: estimates are about the right
 * order of magnitude, not the last digit.
 */
export function EstimateQuiz({ items, lang, onDone }: { items: Estimate[]; lang: Lang; onDone: (answers: number[]) => void }) {
  const ui = UI[lang];
  const [i, setI] = useState(0);
  const [draft, setDraft] = useState("");
  const [answers, setAnswers] = useState<number[]>([]);
  const q = items[i];
  const mine = answers[i];
  const checked = mine !== undefined;
  const last = i === items.length - 1;
  const value = Number(draft.replace(/[,\s]/g, ""));
  const ratio = checked ? mine / q.answer : 1;
  const ok = checked && Math.abs(ratio - 1) <= q.tolerance;

  const check = () => { if (draft.trim() && Number.isFinite(value)) setAnswers((a) => { const n = [...a]; n[i] = value; return n; }); };
  const next = () => { if (last) onDone(answers); else { setI(i + 1); setDraft(""); } };

  return (
    <div key={q.id} className="sd-a-side flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="sd-kicker text-sd-accent-700">{ui.label} · {i + 1} / {items.length}</span>
        <span className="flex gap-1" aria-hidden="true">
          {items.map((x, k) => <span key={x.id} className={clsx("h-[5px] w-6 rounded-full", k < i || (k === i && checked) ? "bg-sd-accent" : "bg-sd-n-300")} />)}
        </span>
      </div>
      <ul className="m-0 flex list-none flex-col gap-1 border-l-[3px] border-sd-accent p-0 pl-3 text-[15px]">
        {q.given.map((g) => <li key={g}>{g}</li>)}
      </ul>
      <h3 className="m-0 text-[22px] tracking-[-0.02em] lg:text-[26px]">{q.prompt}</h3>
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          inputMode="decimal"
          disabled={checked}
          value={checked ? fmtN(mine) : draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") check(); }}
          placeholder={ui.placeholder}
          aria-label={`${q.prompt} (${q.unit})`}
          className="sd-input min-h-12 w-44 text-lg font-extrabold"
        />
        <span className="text-sm font-semibold text-sd-n-700">{q.unit}</span>
        {!checked && <button type="button" onClick={check} disabled={!draft.trim() || !Number.isFinite(value)} className="sd-btn sd-btn-primary h-12">{ui.check}</button>}
      </div>
      {checked && (
        <div className="sd-a-in flex flex-col gap-3" style={{ animationDuration: ".3s" }}>
          <span className={clsx("text-sm font-extrabold", ok ? "text-sd-ink" : "text-sd-accent-700")}>
            {ok ? ui.right : ratio > 1 ? ui.high(fmtN(Math.round(ratio * 10) / 10)) : ui.low(fmtN(Math.round((1 / ratio) * 10) / 10))} {ui.answer}: ≈ {fmtN(q.answer)} {q.unit}
          </span>
          <div>
            <h6 className="sd-h6 mb-1.5">{ui.working}</h6>
            <div className="border-t-2 border-sd-divider">
              {q.working.map((w, k) => (
                <div key={w} className="grid grid-cols-[28px_1fr] gap-2 border-b border-sd-divider py-2 text-[15px] leading-[1.4]"><span className="font-extrabold text-sd-accent">{k + 1}</span><span>{w}</span></div>
              ))}
            </div>
          </div>
          <button type="button" onClick={next} className="sd-btn sd-btn-primary h-11 self-start gap-2">{last ? ui.done : ui.next}<Icon name="arrowR" size={16} /></button>
        </div>
      )}
    </div>
  );
}
