"use client";

import clsx from "clsx";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  DIFFICULTIES,
  DIFFICULTY_LABEL,
  QUESTION_TYPES,
  TYPE_LABEL,
  filterQuestions,
  isMulti,
  type Difficulty,
  type LibraryQuestion,
  type QuestionType,
} from "@/lib/company/library-rules";

const input = "w-full border border-line/60 bg-white px-3 py-2 text-sm focus:border-ink focus:outline-none";
const chip = (on: boolean) => clsx("border px-2 py-1 text-xs font-bold", on ? "border-ink bg-ink text-paper" : "border-line/60 hover:border-ink");

/**
 * Choose questions from the library for a test (L2). Klymb Library and, for
 * a company, My Library; narrow by type, difficulty and words; tick several,
 * then add. The test gets copies: later edits in the library never change it.
 */
export function LibraryPicker({
  klymb,
  mine,
  room,
  onAdd,
  onClose,
}: {
  klymb: LibraryQuestion[];
  /** Null for Klymb's own tests: they draw on Klymb's library only. */
  mine: LibraryQuestion[] | null;
  /** How many more questions the test can take. */
  room: number;
  onAdd: (qs: LibraryQuestion[]) => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<"klymb" | "mine">("klymb");
  const [types, setTypes] = useState<QuestionType[]>([]);
  const [difficulties, setDifficulties] = useState<Difficulty[]>([]);
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState<Map<string, LibraryQuestion>>(new Map());
  const dialog = useRef<HTMLDivElement>(null);

  useEffect(() => {
    dialog.current?.focus();
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onClose]);

  const list = tab === "mine" && mine ? mine : klymb;
  const shown = useMemo(() => filterQuestions(list, { types, difficulties, tag: null, q: q.trim().replace(/\s+/g, " ") || null }), [list, types, difficulties, q]);
  const toggle = <T,>(xs: T[], x: T) => (xs.includes(x) ? xs.filter((y) => y !== x) : [...xs, x]);
  const full = picked.size >= room;

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-center bg-ink/50 p-0 sm:items-center sm:p-6">
      <div ref={dialog} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="picker-title" className="flex max-h-full w-full max-w-3xl flex-col bg-paper shadow-xl outline-none">
        <div className="flex items-center justify-between gap-3 border-b border-line/40 p-4">
          <h2 id="picker-title" className="display text-xl">Add questions from the library</h2>
          <button type="button" onClick={onClose} className="border border-line/60 px-3 py-1 text-xs font-bold hover:border-ink">Close</button>
        </div>

        <div className="flex flex-col gap-3 border-b border-line/40 p-4">
          {mine && (
            <div className="flex gap-1" role="tablist" aria-label="Libraries">
              {(["klymb", "mine"] as const).map((t) => (
                <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={chip(tab === t)}>
                  {t === "klymb" ? `Klymb Library (${klymb.length})` : `My Library (${mine.length})`}
                </button>
              ))}
            </div>
          )}
          <label className="flex flex-col gap-1 text-xs font-bold">
            Search
            <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Titles, questions and tags" className={input} />
          </label>
          <div className="flex flex-wrap gap-1" aria-label="Type">
            {QUESTION_TYPES.map((t) => (
              <button key={t} type="button" aria-pressed={types.includes(t)} onClick={() => setTypes((x) => toggle(x, t))} className={chip(types.includes(t))}>{TYPE_LABEL[t]}</button>
            ))}
            <span className="mx-1 border-l border-line/40" aria-hidden="true" />
            {DIFFICULTIES.map((d) => (
              <button key={d} type="button" aria-pressed={difficulties.includes(d)} onClick={() => setDifficulties((x) => toggle(x, d))} className={chip(difficulties.includes(d))}>{DIFFICULTY_LABEL[d]}</button>
            ))}
          </div>
        </div>

        <ul className="flex min-h-40 flex-col gap-2 overflow-y-auto p-4" aria-label="Questions">
          {shown.length === 0 && <li className="text-sm text-muted">{list.length ? "No questions match." : tab === "mine" ? "Your company has no questions of its own yet." : "Klymb's library is empty for now."}</li>}
          {shown.map((x) => {
            const on = picked.has(x.id);
            return (
              <li key={x.id}>
                <label className={clsx("flex cursor-pointer items-start gap-3 border p-3", on ? "border-ink" : "border-line/40 hover:border-ink")}>
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={on}
                    disabled={!on && full}
                    onChange={() =>
                      setPicked((m) => {
                        const next = new Map(m);
                        if (next.has(x.id)) next.delete(x.id);
                        else next.set(x.id, x);
                        return next;
                      })
                    }
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-bold">{x.title}</span>
                    <span className="mt-0.5 block text-xs text-muted">
                      {TYPE_LABEL[x.type]}{x.type === "mcq" && isMulti(x) ? " · several correct" : ""} · {DIFFICULTY_LABEL[x.difficulty]} · {x.points} points · {x.minutes} min
                      {x.tags.length ? ` · ${x.tags.join(", ")}` : ""}
                    </span>
                  </span>
                </label>
              </li>
            );
          })}
        </ul>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line/40 p-4">
          <p className="text-xs text-muted" aria-live="polite">
            {picked.size ? `${picked.size} chosen` : "Tick the questions to add."}
            {full && room > 0 && " The test is full at 20 questions."}
            {room <= 0 && " The test already has 20 questions."}
          </p>
          <button
            type="button"
            disabled={!picked.size}
            onClick={() => onAdd([...picked.values()])}
            className="bg-ink px-4 py-2 text-xs font-bold uppercase tracking-wider text-paper disabled:opacity-40"
          >
            Add {picked.size || ""} {picked.size === 1 ? "question" : "questions"}
          </button>
        </div>
      </div>
    </div>
  );
}
