"use client";

import clsx from "clsx";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { BTN_PRIMARY, BTN_SECONDARY } from "@/components/company/HiringParts";
import { OVERLAY_MS, Overlay } from "@/components/company/Overlay";
import { mcqPoints } from "@/lib/company/review-rules";

export type DrawerTab = "description" | "answer" | "analytics" | "try";

/**
 * The Library's question drawer (P0.2b): a right-hand panel over the list,
 * which keeps its filters, page and scroll. Closing plays the exit and then
 * drops the question from the address. Tabs switch on the spot.
 */
export function QuestionDrawer({
  closeHref, title, kicker, actions, tabs, initial = "description",
}: {
  closeHref: string;
  title: string;
  kicker: string;
  actions?: React.ReactNode;
  tabs: { key: DrawerTab; label: string; body: React.ReactNode }[];
  initial?: DrawerTab;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(true);
  const [tab, setTab] = useState<DrawerTab>(tabs.some((t) => t.key === initial) ? initial : "description");
  const close = () => {
    setOpen(false);
    window.setTimeout(() => router.push(closeHref, { scroll: false }), OVERLAY_MS);
  };
  const current = tabs.find((t) => t.key === tab) ?? tabs[0];
  return (
    <Overlay open={open} onClose={close} kind="drawer" size="lg" title={title} description={kicker}>
      <div className="-mx-5 -mt-4 mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-line/30 px-5">
        <div role="tablist" aria-label="Question" className="flex gap-5">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={t.key === tab}
              onClick={() => setTab(t.key)}
              className={clsx("-mb-px border-b-2 py-3 text-sm font-bold", t.key === tab ? "border-red-strong text-ink" : "border-transparent text-muted hover:text-ink")}
            >
              {t.label}
            </button>
          ))}
        </div>
        {actions && <div className="flex items-center gap-2 py-2">{actions}</div>}
      </div>
      <div role="tabpanel">{current.body}</div>
    </Overlay>
  );
}

/** Try question: answer it as a candidate would; nothing is saved and no score is recorded. */
export function TryQuestion({ statement, options, partial, points }: { statement: string; options: { text: string; correct: boolean }[]; partial: boolean; points: number }) {
  const multi = options.filter((o) => o.correct).length > 1;
  const [picked, setPicked] = useState<number[]>([]);
  const [checked, setChecked] = useState(false);
  const got = mcqPoints({ options, points, partial }, picked);
  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <p className="rounded-md bg-white px-3 py-2 text-xs text-muted">Practice only: nothing you pick here is saved or scored.</p>
      <p className="whitespace-pre-line text-sm leading-relaxed">{statement}</p>
      <p className="text-xs font-bold text-muted">{multi ? "Choose all that apply" : "Choose one"} · {points} points</p>
      <ul className="flex flex-col gap-2">
        {options.map((o, i) => {
          const on = picked.includes(i);
          return (
            <li key={i}>
              <label className={clsx("flex cursor-pointer items-start gap-3 rounded-md border-2 bg-white p-3 text-sm",
                checked && o.correct ? "border-[#2f7d4f]" : checked && on ? "border-error" : on ? "border-ink" : "border-line/40")}>
                <input
                  type={multi ? "checkbox" : "radio"}
                  name="try"
                  checked={on}
                  onChange={() => { setChecked(false); setPicked((p) => (multi ? (on ? p.filter((x) => x !== i) : [...p, i]) : [i])); }}
                  className="mt-0.5"
                />
                <span>{o.text}{checked && o.correct && <span className="ml-2 text-xs font-bold text-[#2f7d4f]">correct</span>}</span>
              </label>
            </li>
          );
        })}
      </ul>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className={BTN_PRIMARY} disabled={!picked.length} onClick={() => setChecked(true)}>Check</button>
        <button type="button" className={BTN_SECONDARY} onClick={() => { setPicked([]); setChecked(false); }}>Reset</button>
        {checked && <p role="status" className="text-sm font-bold">{got} / {points} points</p>}
      </div>
    </div>
  );
}
