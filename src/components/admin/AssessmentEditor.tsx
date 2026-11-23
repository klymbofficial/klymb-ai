"use client";

import { useMemo, useState } from "react";
import { publishAssessment, saveAssessmentDraft } from "@/app/admin/assessment-actions";
import {
  LIMITS,
  RESULTS,
  RESULTS_LABEL,
  SUBMISSIONS,
  SUBMISSION_LABEL,
  publishGaps,
  readContent,
  sameContent,
  totalPoints,
  type AssessmentContent,
} from "@/lib/company/assessment-rules";

const input = "w-full border border-line/60 bg-white px-3 py-2 text-sm font-normal focus:border-ink focus:outline-none";
const label = "flex flex-col gap-1 text-xs font-bold";
const h2 = "display text-lg";
const primary = "bg-ink px-4 py-2 text-xs font-bold uppercase tracking-wider text-paper disabled:opacity-40";
const secondary = "border-2 border-ink px-4 py-1.5 text-xs font-bold uppercase tracking-wider hover:bg-ink hover:text-paper disabled:opacity-40";
const small = "border border-line/60 px-2 py-1 text-xs font-bold hover:border-ink disabled:opacity-30";

interface Row { title: string; skill: string; points: string; guide: string }
interface Form {
  role: string;
  minutes: string;
  submission: string;
  results: string;
  toolsAllowed: string;
  toolsNotAllowed: string;
  instructions: string;
  taskTitle: string;
  taskBrief: string;
  sampleTitle: string;
  sampleBrief: string;
  rubric: Row[];
}

const formOf = (c: AssessmentContent): Form => ({
  role: c.role,
  minutes: c.minutes === null ? "" : String(c.minutes),
  submission: c.submission,
  results: c.results,
  toolsAllowed: c.toolsAllowed.join("\n"),
  toolsNotAllowed: c.toolsNotAllowed.join("\n"),
  instructions: c.instructions,
  taskTitle: c.taskTitle,
  taskBrief: c.taskBrief,
  sampleTitle: c.sampleTitle,
  sampleBrief: c.sampleBrief,
  rubric: c.rubric.map((r) => ({ title: r.title, skill: r.skill, points: String(r.points), guide: r.guide })),
});

const rawOf = (f: Form) => ({ ...f, rubric: f.rubric.map((r) => ({ ...r, points: Number(r.points) })) });

/**
 * A Klymb admin's editor for one assessment's draft. Saving keeps a draft
 * (unfinished is fine); publishing turns the saved draft into the next
 * numbered version, which never changes. One main action at a time: Save
 * while there are unsaved edits, Publish once it is saved and ready.
 */
export function AssessmentEditor({
  slug, initial, revision: startRevision, skills, latest, nextVersion,
}: {
  slug: string;
  initial: AssessmentContent;
  /** 0 when nothing is saved yet. */
  revision: number;
  /** The item's catalog skills, offered for each rubric area. */
  skills: string[];
  /** The newest published version's content, to tell whether publishing would change anything. */
  latest: { version: number; content: AssessmentContent } | null;
  nextVersion: number;
}) {
  const [form, setForm] = useState<Form>(() => formOf(initial));
  const [saved, setSaved] = useState<string>(() => JSON.stringify(formOf(initial)));
  const [revision, setRevision] = useState(startRevision);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [published, setPublished] = useState<number | null>(null);

  const dirty = JSON.stringify(form) !== saved || revision === 0;
  const parsed = useMemo(() => readContent(rawOf(form)), [form]);
  const gaps = parsed.ok ? publishGaps(parsed.value) : [];
  const unchanged = parsed.ok && latest !== null && sameContent(parsed.value, latest.content);
  const canPublish = !dirty && parsed.ok && !gaps.length && !unchanged && published === null;

  const set = <K extends keyof Form>(key: K, value: Form[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setPublished(null);
  };
  const setRow = (i: number, patch: Partial<Row>) => set("rubric", form.rubric.map((r, k) => (k === i ? { ...r, ...patch } : r)));
  const move = (i: number, by: -1 | 1) => {
    const next = [...form.rubric];
    [next[i], next[i + by]] = [next[i + by], next[i]];
    set("rubric", next);
  };

  async function save() {
    setBusy(true);
    setMsg(null);
    const out = await saveAssessmentDraft(slug, rawOf(form), revision);
    setBusy(false);
    // The status line already says it saved, and what's left; only a refusal needs its own message.
    setMsg(out.ok ? null : { ok: false, text: out.message });
    if (out.ok) {
      setRevision(out.revision);
      setSaved(JSON.stringify(form));
    }
  }

  async function publish() {
    if (!window.confirm(`Publish as version ${nextVersion}? A published version can't be changed.`)) return;
    setBusy(true);
    setMsg(null);
    const out = await publishAssessment(slug, revision);
    setBusy(false);
    setMsg({ ok: out.ok, text: out.message });
    if (out.ok) setPublished(out.version);
  }

  const skillChoices = (current: string) => (current && !skills.includes(current) ? [current, ...skills] : skills);

  return (
    <form
      className="flex flex-col gap-10"
      onSubmit={(e) => {
        e.preventDefault();
        void (dirty ? save() : publish());
      }}
    >
      <section className="flex flex-col gap-4" aria-labelledby="ae-basics">
        <h2 id="ae-basics" className={h2}>Who and how long</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className={label}>
            Role it tests
            <input value={form.role} onChange={(e) => set("role", e.target.value)} maxLength={LIMITS.role} className={input} />
          </label>
          <label className={label}>
            Minutes allowed after starting
            <input type="number" min={LIMITS.minutesMin} max={LIMITS.minutesMax} value={form.minutes} onChange={(e) => set("minutes", e.target.value)} className={input} />
          </label>
          <label className={label}>
            What people hand in
            <select value={form.submission} onChange={(e) => set("submission", e.target.value)} className={input}>
              {SUBMISSIONS.map((s) => <option key={s} value={s}>{SUBMISSION_LABEL[s]}</option>)}
            </select>
          </label>
          <label className={label}>
            What candidates see afterwards
            <select value={form.results} onChange={(e) => set("results", e.target.value)} className={input}>
              {RESULTS.map((r) => <option key={r} value={r}>{RESULTS_LABEL[r]}</option>)}
            </select>
          </label>
        </div>
      </section>

      <section className="flex flex-col gap-4" aria-labelledby="ae-task">
        <h2 id="ae-task" className={h2}>The real task</h2>
        <p className="-mt-2 text-xs text-muted">Candidates see it only once they start. Company recruiters and reviewers can read it.</p>
        <label className={label}>
          Title
          <input value={form.taskTitle} onChange={(e) => set("taskTitle", e.target.value)} maxLength={LIMITS.title} className={input} />
        </label>
        <label className={label}>
          Brief
          <textarea value={form.taskBrief} onChange={(e) => set("taskBrief", e.target.value)} maxLength={LIMITS.brief} rows={8} className={input} />
        </label>
        <label className={label}>
          Instructions for candidates
          <textarea value={form.instructions} onChange={(e) => set("instructions", e.target.value)} maxLength={LIMITS.instructions} rows={4} className={input} />
        </label>
      </section>

      <section className="flex flex-col gap-4" aria-labelledby="ae-tools">
        <h2 id="ae-tools" className={h2}>Tools</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className={label}>
            Allowed, one per line
            <textarea value={form.toolsAllowed} onChange={(e) => set("toolsAllowed", e.target.value)} rows={4} className={input} />
          </label>
          <label className={label}>
            Not allowed, one per line
            <textarea value={form.toolsNotAllowed} onChange={(e) => set("toolsNotAllowed", e.target.value)} rows={4} className={input} />
          </label>
        </div>
      </section>

      <section className="flex flex-col gap-4" aria-labelledby="ae-rubric">
        <h2 id="ae-rubric" className={h2}>Rubric · {totalPoints(form.rubric.map((r) => ({ ...r, points: Number(r.points) || 0 })))} points</h2>
        <p className="-mt-2 text-xs text-muted">Candidates see each area&apos;s name and points. Only reviewers see the scoring guide.</p>
        <ol className="flex flex-col gap-4">
          {form.rubric.map((r, i) => (
            <li key={i} className="card flex flex-col gap-3 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-extrabold uppercase tracking-[0.14em] text-muted">Area {i + 1}</span>
                <span className="flex gap-1">
                  <button type="button" className={small} disabled={i === 0} onClick={() => move(i, -1)} aria-label={`Move area ${i + 1} up`}>↑</button>
                  <button type="button" className={small} disabled={i === form.rubric.length - 1} onClick={() => move(i, 1)} aria-label={`Move area ${i + 1} down`}>↓</button>
                  <button type="button" className={small} onClick={() => set("rubric", form.rubric.filter((_, k) => k !== i))}>Remove</button>
                </span>
              </div>
              <div className="grid gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_6rem]">
                <label className={label}>
                  Name
                  <input value={r.title} onChange={(e) => setRow(i, { title: e.target.value })} maxLength={LIMITS.criterionTitle} className={input} />
                </label>
                <label className={label}>
                  Skill
                  <select value={r.skill} onChange={(e) => setRow(i, { skill: e.target.value })} className={input}>
                    <option value="">Choose…</option>
                    {skillChoices(r.skill).map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </label>
                <label className={label}>
                  Points
                  <input type="number" min={1} max={LIMITS.pointsMax} value={r.points} onChange={(e) => setRow(i, { points: e.target.value })} className={input} />
                </label>
              </div>
              <label className={label}>
                Scoring guide: what earns full points, and what loses them
                <textarea value={r.guide} onChange={(e) => setRow(i, { guide: e.target.value })} maxLength={LIMITS.guide} rows={3} className={input} />
              </label>
            </li>
          ))}
        </ol>
        {form.rubric.length < LIMITS.criteria && (
          <button type="button" className={`${secondary} self-start`} onClick={() => set("rubric", [...form.rubric, { title: "", skill: "", points: "4", guide: "" }])}>
            Add an area
          </button>
        )}
        {!skills.length && <p className="text-xs text-muted">This item has no skills in the catalog yet. Add them on the Business catalog page to choose one here.</p>}
      </section>

      <section className="flex flex-col gap-4" aria-labelledby="ae-practice">
        <h2 id="ae-practice" className={h2}>Practice task</h2>
        <p className="-mt-2 text-xs text-muted">Shown before the test, so people can prepare. Make it different from the real task.</p>
        <label className={label}>
          Title
          <input value={form.sampleTitle} onChange={(e) => set("sampleTitle", e.target.value)} maxLength={LIMITS.title} className={input} />
        </label>
        <label className={label}>
          Brief
          <textarea value={form.sampleBrief} onChange={(e) => set("sampleBrief", e.target.value)} maxLength={LIMITS.sampleBrief} rows={4} className={input} />
        </label>
      </section>

      <div className="sticky bottom-0 -mx-4 flex flex-col gap-2 border-t border-line/40 bg-paper px-4 py-4 sm:mx-0 sm:px-0">
        <p className="text-xs text-muted" aria-live="polite">
          {published !== null
            ? `Version ${published} is published.`
            : dirty
              ? revision === 0 ? "Not saved yet. This draft starts from the catalog listing." : "Unsaved changes."
              : !parsed.ok
                ? parsed.message
                : gaps.length
                  ? `To publish, add ${gaps.join(", ")}.`
                  : unchanged
                    ? `Saved. Same as version ${latest!.version}, so there's nothing to publish.`
                    : `Saved. Ready to publish as version ${nextVersion}.`}
        </p>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => void save()} disabled={busy || !dirty} className={dirty ? primary : secondary}>
            {busy && dirty ? "Saving…" : "Save draft"}
          </button>
          <button type="button" onClick={() => void publish()} disabled={busy || !canPublish} className={canPublish ? primary : secondary}>
            {busy && !dirty ? "Publishing…" : `Publish version ${nextVersion}`}
          </button>
        </div>
        {msg && <p role={msg.ok ? "status" : "alert"} className={`text-xs font-semibold ${msg.ok ? "text-ink" : "text-error"}`}>{msg.text}</p>}
      </div>
    </form>
  );
}
