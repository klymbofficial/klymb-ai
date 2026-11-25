"use client";

import { useState, useTransition } from "react";
import { BTN_PRIMARY, BTN_SECONDARY } from "@/components/company/HiringParts";
import { useConfirm } from "@/components/company/Overlay";
import { LIMITS } from "@/lib/company/assessment-rules";
import {
  DIFFICULTIES,
  DIFFICULTY_LABEL,
  LIB_LIMITS,
  QUESTION_TYPES,
  TYPE_LABEL,
  type Difficulty,
  type QuestionInput,
  type QuestionStatus,
  type QuestionType,
} from "@/lib/company/library-rules";

const input = "w-full rounded-md border-2 border-line/50 bg-white px-3 py-2 text-sm focus:border-ink";
const label = "flex flex-col gap-1 text-sm font-bold";
const small = "text-xs font-bold underline underline-offset-2 hover:text-red-deep disabled:opacity-40 disabled:no-underline";

type Area = { title: string; skill: string; points: string; guide: string };
type Option = { text: string; correct: boolean };

const STATUS_LABEL: Record<QuestionStatus, string> = { draft: "Draft (companies don't see it)", published: "Published", retired: "Retired (hidden)" };

/**
 * One library question: its type, the question itself, difficulty, tags and
 * time; then the options and the right answers for multiple choice, or the
 * scoring areas for a written question. Shared by My Library and Klymb's
 * admin; `withStatus` adds the admin's draft/published/retired choice. The
 * server checks everything again (src/lib/company/library-rules.ts).
 */
export function QuestionForm({
  initial,
  save,
  submitLabel,
  withStatus,
}: {
  initial: QuestionInput | null;
  save: (form: Record<string, unknown>, status: QuestionStatus) => Promise<{ ok: false; message: string } | null>;
  submitLabel: string;
  withStatus?: QuestionStatus;
}) {
  const [type, setType] = useState<QuestionType>(initial?.type ?? "mcq");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [statement, setStatement] = useState(initial?.statement ?? "");
  const [difficulty, setDifficulty] = useState<Difficulty>(initial?.difficulty ?? "easy");
  const [tags, setTags] = useState((initial?.tags ?? []).join(", "));
  const [minutes, setMinutes] = useState(String(initial?.minutes ?? 2));
  const [points, setPoints] = useState(String(initial?.type === "mcq" ? initial.points : 2));
  const [options, setOptions] = useState<Option[]>(initial?.options?.map((o) => ({ ...o })) ?? [{ text: "", correct: true }, { text: "", correct: false }, { text: "", correct: false }, { text: "", correct: false }]);
  const [partial, setPartial] = useState(initial?.partial ?? false);
  const [areas, setAreas] = useState<Area[]>(
    initial?.rubric?.map((c) => ({ title: c.title, skill: c.skill, points: String(c.points), guide: c.guide })) ?? [{ title: "", skill: "", points: "5", guide: "" }],
  );
  const [status, setStatus] = useState<QuestionStatus>(withStatus ?? "published");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const correct = options.filter((o) => o.correct).length;
  const total = areas.reduce((s, a) => s + (Number(a.points) || 0), 0);
  const setOption = (i: number, patch: Partial<Option>) => setOptions((all) => all.map((o, j) => (j === i ? { ...o, ...patch } : o)));
  const setArea = (i: number, patch: Partial<Area>) => setAreas((all) => all.map((a, j) => (j === i ? { ...a, ...patch } : a)));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const form: Record<string, unknown> = { type, title, statement, difficulty, tags, minutes, points };
    if (type === "mcq") {
      form.options = options;
      form.partial = correct > 1 && partial;
    } else {
      form.rubric = areas.map((a) => ({ ...a, points: Number(a.points) }));
    }
    start(async () => {
      const out = await save(form, status);
      if (out && !out.ok) setError(out.message);
    });
  }

  return (
    <form onSubmit={submit} className="flex max-w-3xl flex-col gap-6">
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-bold">Question type</legend>
        <div className="flex flex-wrap gap-2">
          {QUESTION_TYPES.map((t) => (
            <label key={t} className={`flex cursor-pointer items-center gap-2 rounded-md border-2 px-3 py-2 text-sm font-bold ${type === t ? "border-ink" : "border-line/40"}`}>
              <input type="radio" name="type" value={t} checked={type === t} onChange={() => setType(t)} />
              {TYPE_LABEL[t]}
            </label>
          ))}
        </div>
      </fieldset>

      <label className={label}>
        Title
        <input value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={LIB_LIMITS.title} placeholder="e.g. Which join keeps every row?" className={input} />
      </label>
      <label className={label}>
        Question
        <textarea value={statement} onChange={(e) => setStatement(e.target.value)} required rows={5} maxLength={LIB_LIMITS.statement} className={input} />
      </label>

      <div className="grid gap-4 sm:grid-cols-3">
        <label className={label}>
          Difficulty
          <select value={difficulty} onChange={(e) => setDifficulty(e.target.value as Difficulty)} className={input}>
            {DIFFICULTIES.map((d) => <option key={d} value={d}>{DIFFICULTY_LABEL[d]}</option>)}
          </select>
        </label>
        <label className={label}>
          Recommended time (minutes)
          <input type="number" min={1} max={LIB_LIMITS.minutes} value={minutes} onChange={(e) => setMinutes(e.target.value)} required className={input} />
        </label>
        {type === "mcq" ? (
          <label className={label}>
            Points
            <input type="number" min={1} max={LIB_LIMITS.points} value={points} onChange={(e) => setPoints(e.target.value)} required className={input} />
          </label>
        ) : (
          <p className="flex flex-col gap-1 text-sm font-bold">Points<span className="py-2 font-normal">{total} (the scoring areas&apos; total)</span></p>
        )}
      </div>

      <label className={label}>
        Tags <span className="font-normal text-muted">(comma-separated, up to {LIB_LIMITS.tags})</span>
        <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="e.g. SQL, Joins" className={input} />
      </label>

      {type === "mcq" ? (
        <fieldset className="flex flex-col gap-3 border-t border-line/30 pt-5">
          <legend className="text-sm font-bold">Options <span className="font-normal text-muted">— tick every correct one ({LIB_LIMITS.optionsMin} to {LIB_LIMITS.optionsMax})</span></legend>
          {options.map((o, i) => (
            <div key={i} className="flex items-start gap-3">
              <label className="mt-2 flex items-center gap-1 text-xs font-bold">
                <input type="checkbox" checked={o.correct} onChange={(e) => setOption(i, { correct: e.target.checked })} aria-label={`Option ${i + 1} is correct`} />
                Correct
              </label>
              <input value={o.text} onChange={(e) => setOption(i, { text: e.target.value })} maxLength={LIB_LIMITS.option} aria-label={`Option ${i + 1}`} placeholder={`Option ${i + 1}`} className={input} />
              <button type="button" onClick={() => setOptions((all) => all.filter((_, j) => j !== i))} disabled={options.length <= LIB_LIMITS.optionsMin} className={`${small} mt-2`}>Remove</button>
            </div>
          ))}
          <div className="flex flex-wrap items-center gap-4">
            <button type="button" onClick={() => setOptions((all) => [...all, { text: "", correct: false }])} disabled={options.length >= LIB_LIMITS.optionsMax} className={small}>Add an option</button>
            <span className="text-xs text-muted">{correct > 1 ? "Several correct: candidates pick all that apply." : "One correct: candidates pick one."}</span>
          </div>
          {correct > 1 && (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={partial} onChange={(e) => setPartial(e.target.checked)} />
              Partial marks: each right pick earns a share, each wrong pick takes one back, never below zero
            </label>
          )}
        </fieldset>
      ) : (
        <fieldset className="flex flex-col gap-4 border-t border-line/30 pt-5">
          <legend className="text-sm font-bold">Scoring areas <span className="font-normal text-muted">— a reviewer scores each (1 to {LIMITS.pointsMax} points)</span></legend>
          {areas.map((a, i) => (
            <div key={i} className="grid gap-2 rounded-md border border-line/30 p-3 sm:grid-cols-[2fr_1fr_6rem]">
              <input value={a.title} onChange={(e) => setArea(i, { title: e.target.value })} maxLength={LIMITS.criterionTitle} aria-label={`Area ${i + 1} name`} placeholder="Area name" className={input} />
              <input value={a.skill} onChange={(e) => setArea(i, { skill: e.target.value })} maxLength={LIMITS.skill} aria-label={`Area ${i + 1} skill`} placeholder="Skill" className={input} />
              <input type="number" min={1} max={LIMITS.pointsMax} value={a.points} onChange={(e) => setArea(i, { points: e.target.value })} aria-label={`Area ${i + 1} points`} className={input} />
              <textarea value={a.guide} onChange={(e) => setArea(i, { guide: e.target.value })} maxLength={LIMITS.guide} rows={2} aria-label={`Area ${i + 1} scoring guide`} placeholder="What a good answer shows (reviewers only)" className={`${input} sm:col-span-3`} />
              <button type="button" onClick={() => setAreas((all) => all.filter((_, j) => j !== i))} disabled={areas.length <= 1} className={`${small} justify-self-start`}>Remove area</button>
            </div>
          ))}
          <button type="button" onClick={() => setAreas((all) => [...all, { title: "", skill: "", points: "5", guide: "" }])} disabled={areas.length >= LIMITS.criteria} className={`${small} self-start`}>Add an area</button>
        </fieldset>
      )}

      {withStatus && (
        <label className={`${label} max-w-xs`}>
          Status
          <select value={status} onChange={(e) => setStatus(e.target.value as QuestionStatus)} className={input}>
            {(Object.keys(STATUS_LABEL) as QuestionStatus[]).map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
          </select>
        </label>
      )}

      <div className="flex flex-wrap items-center gap-3 border-t border-line/30 pt-5">
        <button type="submit" disabled={pending} className={BTN_PRIMARY}>{pending ? "Saving…" : submitLabel}</button>
        {error && <p role="alert" className="text-sm font-semibold text-error">{error}</p>}
      </div>
    </form>
  );
}

/** Removes a question from My Library after a confirm. */
export function RemoveQuestionButton({ remove }: { remove: () => Promise<{ ok: false; message: string } | null> }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirm, dialog] = useConfirm();
  return (
    <span className="inline-flex items-center gap-3">
      {dialog}
      <button
        type="button"
        disabled={pending}
        className={BTN_SECONDARY}
        onClick={async () => {
          if (!(await confirm({ title: "Remove this question from My Library?", body: "Tests that already use it keep their copy.", confirmLabel: "Remove", cancelLabel: "Keep it" }))) return;
          start(async () => {
            const out = await remove();
            if (out && !out.ok) setError(out.message);
          });
        }}
      >
        {pending ? "Removing…" : "Remove"}
      </button>
      {error && <span role="alert" className="text-sm font-semibold text-error">{error}</span>}
    </span>
  );
}
