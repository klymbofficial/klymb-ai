"use client";

import clsx from "clsx";
import { useState } from "react";
import type { DesignAttempt, Lang } from "@/data/system-design/types";
import { Icon } from "../icons";

const UI = {
  en: {
    brief: "The brief", constraints: "Constraints", yours: "Your design",
    placeholder: "Requirements, a rough estimate, the boxes you'd use and how a request flows, what you'd protect first, one trade-off…",
    need: (n: number) => `${n} more characters to open the walkthrough`, open: "Show the walkthrough",
    walkthrough: "A model answer", check: "Check yourself", cont: "Continue", saved: "Your attempt",
  },
  hi: {
    brief: "Brief", constraints: "Constraints", yours: "Tumhara design",
    placeholder: "Requirements, ek rough estimate, kaunse boxes aur request kaise jaayegi, pehle kya bachaoge, ek trade-off…",
    need: (n: number) => `Walkthrough kholne ke liye ${n} aur characters`, open: "Walkthrough dikhao",
    walkthrough: "Model answer", check: "Khud check karo", cont: "Aage badho", saved: "Tumhara attempt",
  },
};

/**
 * A full design problem. The learner writes an attempt first, in any words;
 * only then does the walkthrough open, followed by a self-check. Attempting
 * before seeing the answer is the point.
 */
export function DesignIt({
  task, lang, saved, checks, onSave, onChecks, onContinue,
}: { task: DesignAttempt; lang: Lang; saved?: string; checks?: boolean[]; onSave: (text: string) => void; onChecks: (c: boolean[]) => void; onContinue: () => void }) {
  const ui = UI[lang];
  const [text, setText] = useState(saved ?? "");
  const left = Math.max(0, task.minChars - text.trim().length);
  const ticks = checks ?? task.checklist.map(() => false);

  return (
    <div className="flex flex-col gap-4">
      <h3 className="m-0 text-[22px] tracking-[-0.02em] lg:text-[26px]">{task.title}</h3>
      <div>
        <h6 className="sd-h6 mb-1.5">{ui.brief}</h6>
        <p className="m-0 rounded-xl bg-sd-surface px-3.5 py-3 text-[15px] leading-[1.45]">{task.brief}</p>
      </div>
      <div>
        <h6 className="sd-h6 mb-1.5">{ui.constraints}</h6>
        <ul className="m-0 flex list-none flex-col gap-1 border-l-[3px] border-sd-accent p-0 pl-3 text-[15px]">{task.constraints.map((c) => <li key={c}>{c}</li>)}</ul>
      </div>

      {!saved ? (
        <div className="flex flex-col gap-2">
          <h6 className="sd-h6 m-0">{ui.yours}</h6>
          <textarea aria-label={ui.yours} value={text} onChange={(e) => setText(e.target.value)} rows={8} maxLength={4000} placeholder={ui.placeholder} className="sd-input min-h-[180px] text-[15px] leading-[1.45]" />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs text-sd-n-700">{left ? ui.need(left) : ""}</span>
            <button type="button" disabled={left > 0} onClick={() => onSave(text.trim())} className="sd-btn sd-btn-primary h-11 gap-2">{ui.open}<Icon name="arrowR" size={16} /></button>
          </div>
        </div>
      ) : (
        <div className="sd-a-in flex flex-col gap-4">
          <details className="rounded-xl bg-sd-surface px-3.5 py-2.5 text-sm">
            <summary className="cursor-pointer font-extrabold">{ui.saved}</summary>
            <p className="m-0 mt-2 whitespace-pre-wrap">{saved}</p>
          </details>
          <div>
            <h6 className="sd-h6 mb-2">{ui.walkthrough}</h6>
            <div className="flex flex-col gap-3">
              {task.walkthrough.map((w, k) => (
                <div key={w.heading} className={clsx("rounded-xl p-4", k % 2 ? "bg-sd-surface" : "border border-sd-divider")}>
                  <span className="text-[17px] font-extrabold"><span className="text-sd-accent">{String(k + 1).padStart(2, "0")}</span> {w.heading}</span>
                  <ul className="m-0 mt-1.5 flex list-disc flex-col gap-1 pl-5 text-[15px] leading-[1.45] marker:text-sd-accent">{w.points.map((p) => <li key={p}>{p}</li>)}</ul>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h6 className="sd-h6 mb-2">{ui.check}</h6>
            <div className="border-t-2 border-sd-divider">
              {task.checklist.map((c, k) => (
                <label key={c} className="flex cursor-pointer items-start gap-3 border-b border-sd-divider py-2.5 text-[15px]">
                  <input type="checkbox" checked={!!ticks[k]} onChange={() => onChecks(ticks.map((t, j) => (j === k ? !t : t)))} className="mt-1 size-4 accent-[var(--sd-accent)]" />
                  <span>{c}</span>
                </label>
              ))}
            </div>
          </div>
          <button type="button" onClick={onContinue} className="sd-btn sd-btn-primary h-11 self-start gap-2">{ui.cont}<Icon name="arrowR" size={16} /></button>
        </div>
      )}
    </div>
  );
}
