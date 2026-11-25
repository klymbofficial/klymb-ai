"use client";

import { useMemo, useState } from "react";
import { LibraryPicker } from "@/components/library/LibraryPicker";
import { publishAssessment, saveAssessmentDraft, type DraftResult, type PublishResult } from "@/app/admin/assessment-actions";
import {
  LIMITS,
  RESULTS,
  RESULTS_LABEL,
  SUBMISSIONS,
  SUBMISSION_LABEL,
  MCQ_LIMITS,
  publishGaps,
  questionsOf,
  readContent,
  sameContent,
  totalPoints,
  type AssessmentContent,
} from "@/lib/company/assessment-rules";
import type { LibraryQuestion } from "@/lib/company/library-rules";

const input = "w-full border border-line/60 bg-white px-3 py-2 text-sm font-normal focus:border-ink focus:outline-none";
const label = "flex flex-col gap-1 text-xs font-bold";
const h2 = "display text-lg";
const primary = "bg-ink px-4 py-2 text-xs font-bold uppercase tracking-wider text-paper disabled:opacity-40";
const secondary = "border-2 border-ink px-4 py-1.5 text-xs font-bold uppercase tracking-wider hover:bg-ink hover:text-paper disabled:opacity-40";
const small = "border border-line/60 px-2 py-1 text-xs font-bold hover:border-ink disabled:opacity-30";

interface Row { title: string; skill: string; points: string; guide: string }
/** One question as typed (U04b). A test with one question and no section is the one-task test. */
/** `kind` is a written hand-in ('written' or 'written_file') or 'mcq' (L2), whose options and points replace the rubric. */
interface QRow {
  section: string; title: string; brief: string; kind: string; rubric: Row[];
  options: { text: string; correct: boolean }[]; points: string; partial: boolean;
  /** The library question it was copied from. */
  source?: string;
}
interface Form {
  /** A company test's name; Klymb's tests take theirs from code, and leave it empty. */
  title: string;
  role: string;
  minutes: string;
  results: string;
  toolsAllowed: string;
  toolsNotAllowed: string;
  instructions: string;
  sampleTitle: string;
  sampleBrief: string;
  questions: QRow[];
}

const formOf = (c: AssessmentContent, title = ""): Form => ({
  title,
  role: c.role,
  minutes: c.minutes === null ? "" : String(c.minutes),
  results: c.results,
  toolsAllowed: c.toolsAllowed.join("\n"),
  toolsNotAllowed: c.toolsNotAllowed.join("\n"),
  instructions: c.instructions,
  sampleTitle: c.sampleTitle,
  sampleBrief: c.sampleBrief,
  questions: questionsOf(c).map((q) => ({
    section: q.section, title: q.title, brief: q.brief, kind: q.mcq ? "mcq" : q.submission,
    rubric: q.rubric.map((r) => ({ title: r.title, skill: r.skill, points: String(r.points), guide: r.guide })),
    options: q.mcq ? q.mcq.options.map((o) => ({ ...o })) : [],
    points: q.mcq ? String(q.mcq.points) : "2",
    partial: q.mcq?.partial ?? false,
    ...(q.source ? { source: q.source } : {}),
  })),
});

const rawOf = (f: Form) => ({
  ...f,
  questions: f.questions.map((q) =>
    q.kind === "mcq"
      ? { section: q.section, title: q.title, brief: q.brief, kind: "mcq", options: q.options, points: Number(q.points), partial: q.partial, source: q.source }
      : { section: q.section, title: q.title, brief: q.brief, submission: q.kind, rubric: q.rubric.map((r) => ({ ...r, points: Number(r.points) })), source: q.source },
  ),
});

const blankQuestion = (section: string): QRow => ({
  section, title: "", brief: "", kind: "written", rubric: [{ title: "", skill: "", points: "4", guide: "" }], options: [], points: "2", partial: false,
});
const blankOptions = () => [{ text: "", correct: true }, { text: "", correct: false }, { text: "", correct: false }, { text: "", correct: false }];

/** A library question as a test question: a copy that remembers where it came from. */
const fromLibrary = (x: LibraryQuestion, section: string): QRow => ({
  section,
  title: x.title,
  brief: x.statement,
  kind: x.type,
  rubric: (x.rubric ?? []).map((r) => ({ title: r.title, skill: r.skill, points: String(r.points), guide: r.guide })),
  options: (x.options ?? []).map((o) => ({ ...o })),
  points: String(x.points),
  partial: x.partial,
  source: x.id,
});
const isBlank = (q: QRow) => !q.title && !q.brief && q.rubric.every((r) => !r.title && !r.guide);
const qPoints = (q: QRow) => (q.kind === "mcq" ? Number(q.points) || 0 : pointsOf(q.rubric));
const pointsOf = (rows: Row[]) => totalPoints(rows.map((r) => ({ ...r, points: Number(r.points) || 0 })));

/**
 * A Klymb admin's editor for one assessment's draft. Saving keeps a draft
 * (unfinished is fine); publishing turns the saved draft into the next
 * numbered version, which never changes. One main action at a time: Save
 * while there are unsaved edits, Publish once it is saved and ready.
 */
export function AssessmentEditor({
  slug, initial, revision: startRevision, skills, latest, nextVersion, title, save: saveAction, publish: publishAction, newNote, library,
}: {
  /** The library to pick questions from (L2): Klymb's, and the company's own for a company test. */
  library?: { klymb: LibraryQuestion[]; mine: LibraryQuestion[] | null };
  slug: string;
  /** Set for a company's own test: its name is edited here too. */
  title?: { value: string; max: number };
  /** Where a save and a publish go; Klymb's admin actions unless given (a company's own test). */
  save?: (form: Record<string, unknown>, expected: number) => Promise<DraftResult>;
  publish?: (revision: number) => Promise<PublishResult>;
  /** What the status line says before the first save. */
  newNote?: string;
  initial: AssessmentContent;
  /** 0 when nothing is saved yet. */
  revision: number;
  /** The item's catalog skills, offered for each rubric area. */
  skills: string[];
  /** The newest published version's content, to tell whether publishing would change anything. */
  latest: { version: number; content: AssessmentContent } | null;
  nextVersion: number;
}) {
  const [form, setForm] = useState<Form>(() => formOf(initial, title?.value));
  const [saved, setSaved] = useState<string>(() => JSON.stringify(formOf(initial, title?.value)));
  const [revision, setRevision] = useState(startRevision);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [published, setPublished] = useState<number | null>(null);
  const [picking, setPicking] = useState(false);

  const dirty = JSON.stringify(form) !== saved || revision === 0;
  const parsed = useMemo(() => readContent(rawOf(form)), [form]);
  const gaps = parsed.ok ? publishGaps(parsed.value) : [];
  const unchanged = parsed.ok && latest !== null && sameContent(parsed.value, latest.content);
  const canPublish = !dirty && parsed.ok && !gaps.length && !unchanged && published === null;

  const set = <K extends keyof Form>(key: K, value: Form[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setPublished(null);
  };
  const swap = <T,>(list: T[], i: number, by: -1 | 1) => {
    const next = [...list];
    [next[i], next[i + by]] = [next[i + by], next[i]];
    return next;
  };
  const setQ = (qi: number, patch: Partial<QRow>) => set("questions", form.questions.map((q, k) => (k === qi ? { ...q, ...patch } : q)));
  const setRow = (qi: number, i: number, patch: Partial<Row>) =>
    setQ(qi, { rubric: form.questions[qi].rubric.map((r, k) => (k === i ? { ...r, ...patch } : r)) });
  const areas = form.questions.reduce((n, q) => n + q.rubric.length, 0);
  // One written question without a section is the one-task test; anything else is a list of questions.
  const single = form.questions.length === 1;
  const one = single && form.questions[0].kind !== "mcq";
  const setOpt = (qi: number, i: number, patch: Partial<QRow["options"][number]>) =>
    setQ(qi, { options: form.questions[qi].options.map((o, k) => (k === i ? { ...o, ...patch } : o)) });
  const addFromLibrary = (picked: LibraryQuestion[]) => {
    const section = form.questions[form.questions.length - 1]?.section ?? "";
    const keep = form.questions.length === 1 && isBlank(form.questions[0]) ? [] : form.questions;
    set("questions", [...keep, ...picked.map((x) => fromLibrary(x, section))].slice(0, LIMITS.questions));
    setPicking(false);
  };

  async function save() {
    setBusy(true);
    setMsg(null);
    const out = await (saveAction ?? ((f, r) => saveAssessmentDraft(slug, f, r)))(rawOf(form), revision);
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
    const out = await (publishAction ?? ((r) => publishAssessment(slug, r)))(revision);
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
        {title && (
          <label className={label}>
            Test name
            <input value={form.title} onChange={(e) => set("title", e.target.value)} maxLength={title.max} required className={input} />
          </label>
        )}
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
            What candidates see afterwards
            <select value={form.results} onChange={(e) => set("results", e.target.value)} className={input}>
              {RESULTS.map((r) => <option key={r} value={r}>{RESULTS_LABEL[r]}</option>)}
            </select>
          </label>
        </div>
      </section>

      <section className="flex flex-col gap-4" aria-labelledby="ae-instructions">
        <h2 id="ae-instructions" className={h2}>Instructions for candidates</h2>
        <label className={label}>
          <span className="sr-only">Instructions for candidates</span>
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

      <section className="flex flex-col gap-4" aria-labelledby="ae-questions">
        <h2 id="ae-questions" className={h2}>
          {one ? "The real task" : `Questions · ${form.questions.length}`} · {form.questions.reduce((n, q) => n + qPoints(q), 0)} points
        </h2>
        <p className="-mt-2 text-xs text-muted">
          Candidates see the questions only once they start, with each rubric area&apos;s name and points. Only reviewers see the scoring guides.
          {!one && " Sections are headings: one clock runs for the whole test."}
        </p>
        <ol className="flex flex-col gap-6">
          {form.questions.map((q, qi) => (
            <li key={qi} className="flex flex-col gap-4 border-2 border-line/40 p-4">
              {!single && (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-extrabold uppercase tracking-[0.14em] text-muted">Question {qi + 1}{q.source ? " · from the library" : ""}</span>
                  <span className="flex gap-1">
                    <button type="button" className={small} disabled={qi === 0} onClick={() => set("questions", swap(form.questions, qi, -1))} aria-label={`Move question ${qi + 1} up`}>↑</button>
                    <button type="button" className={small} disabled={qi === form.questions.length - 1} onClick={() => set("questions", swap(form.questions, qi, 1))} aria-label={`Move question ${qi + 1} down`}>↓</button>
                    <button type="button" className={small} onClick={() => set("questions", form.questions.filter((_, k) => k !== qi))}>Remove question</button>
                  </span>
                </div>
              )}
              <div className="grid gap-3 sm:grid-cols-2">
                <label className={label}>
                  Section (optional)
                  <input value={q.section} onChange={(e) => setQ(qi, { section: e.target.value })} maxLength={LIMITS.section} placeholder="e.g. Part A: design" className={input} />
                </label>
                <label className={label}>
                  Question type
                  <select
                    value={q.kind}
                    onChange={(e) => setQ(qi, { kind: e.target.value, ...(e.target.value === "mcq" && !q.options.length ? { options: blankOptions() } : {}) })}
                    className={input}
                  >
                    {SUBMISSIONS.map((x) => <option key={x} value={x}>{SUBMISSION_LABEL[x]}</option>)}
                    <option value="mcq">Multiple choice</option>
                  </select>
                </label>
              </div>
              <label className={label}>
                Title
                <input value={q.title} onChange={(e) => setQ(qi, { title: e.target.value })} maxLength={LIMITS.title} className={input} />
              </label>
              <label className={label}>
                {one ? "Brief" : "Question"}
                <textarea value={q.brief} onChange={(e) => setQ(qi, { brief: e.target.value })} maxLength={LIMITS.brief} rows={one ? 8 : 5} className={input} />
              </label>

              {q.kind === "mcq" ? (
                <fieldset className="flex flex-col gap-3">
                  <legend className="mb-2 text-sm font-bold">Options · tick every correct one</legend>
                  {q.options.map((o, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <label className="flex shrink-0 items-center gap-1 text-xs font-bold">
                        <input type="checkbox" checked={o.correct} onChange={(e) => setOpt(qi, i, { correct: e.target.checked })} aria-label={`Question ${qi + 1}, option ${i + 1} is correct`} />
                        Correct
                      </label>
                      <input value={o.text} onChange={(e) => setOpt(qi, i, { text: e.target.value })} maxLength={MCQ_LIMITS.option} aria-label={`Question ${qi + 1}, option ${i + 1}`} placeholder={`Option ${i + 1}`} className={input} />
                      <button type="button" className={small} disabled={q.options.length <= MCQ_LIMITS.optionsMin} onClick={() => setQ(qi, { options: q.options.filter((_, k) => k !== i) })}>Remove</button>
                    </div>
                  ))}
                  <div className="flex flex-wrap items-end gap-4">
                    {q.options.length < MCQ_LIMITS.optionsMax && (
                      <button type="button" className={secondary} onClick={() => setQ(qi, { options: [...q.options, { text: "", correct: false }] })}>Add an option</button>
                    )}
                    <label className={`${label} w-28`}>
                      Points
                      <input type="number" min={1} max={MCQ_LIMITS.points} value={q.points} onChange={(e) => setQ(qi, { points: e.target.value })} className={input} />
                    </label>
                    {q.options.filter((o) => o.correct).length > 1 && (
                      <label className="flex items-center gap-2 text-xs font-bold">
                        <input type="checkbox" checked={q.partial} onChange={(e) => setQ(qi, { partial: e.target.checked })} />
                        Partial marks (never below zero)
                      </label>
                    )}
                  </div>
                </fieldset>
              ) : (
              <>
              <h3 className="text-sm font-bold">Rubric{one ? "" : ` for question ${qi + 1}`} · {pointsOf(q.rubric)} points</h3>
              <ol className="flex flex-col gap-4">
                {q.rubric.map((r, i) => (
                  <li key={i} className="card flex flex-col gap-3 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-extrabold uppercase tracking-[0.14em] text-muted">Area {i + 1}</span>
                      <span className="flex gap-1">
                        <button type="button" className={small} disabled={i === 0} onClick={() => setQ(qi, { rubric: swap(q.rubric, i, -1) })} aria-label={`Move area ${i + 1} up`}>↑</button>
                        <button type="button" className={small} disabled={i === q.rubric.length - 1} onClick={() => setQ(qi, { rubric: swap(q.rubric, i, 1) })} aria-label={`Move area ${i + 1} down`}>↓</button>
                        <button type="button" className={small} onClick={() => setQ(qi, { rubric: q.rubric.filter((_, k) => k !== i) })}>Remove</button>
                      </span>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_6rem]">
                      <label className={label}>
                        Name
                        <input value={r.title} onChange={(e) => setRow(qi, i, { title: e.target.value })} maxLength={LIMITS.criterionTitle} className={input} />
                      </label>
                      <label className={label}>
                        Skill
                        {title ? (
                          // A company's own test names its skills freely; there's no catalog list behind it.
                          <input value={r.skill} onChange={(e) => setRow(qi, i, { skill: e.target.value })} maxLength={LIMITS.skill} placeholder="e.g. API design" className={input} />
                        ) : (
                          <select value={r.skill} onChange={(e) => setRow(qi, i, { skill: e.target.value })} className={input}>
                            <option value="">Choose…</option>
                            {skillChoices(r.skill).map((x) => <option key={x} value={x}>{x}</option>)}
                          </select>
                        )}
                      </label>
                      <label className={label}>
                        Points
                        <input type="number" min={1} max={LIMITS.pointsMax} value={r.points} onChange={(e) => setRow(qi, i, { points: e.target.value })} className={input} />
                      </label>
                    </div>
                    <label className={label}>
                      Scoring guide: what earns full points, and what loses them
                      <textarea value={r.guide} onChange={(e) => setRow(qi, i, { guide: e.target.value })} maxLength={LIMITS.guide} rows={3} className={input} />
                    </label>
                  </li>
                ))}
              </ol>
              {q.rubric.length < LIMITS.criteria && areas < LIMITS.areasPerTest && (
                <button type="button" className={`${secondary} self-start`} onClick={() => setQ(qi, { rubric: [...q.rubric, { title: "", skill: "", points: "4", guide: "" }] })}>
                  Add an area
                </button>
              )}
              </>
              )}
            </li>
          ))}
        </ol>
        <div className="flex flex-wrap gap-2">
          {form.questions.length < LIMITS.questions && areas < LIMITS.areasPerTest && (
            <button type="button" className={secondary} onClick={() => set("questions", [...form.questions, blankQuestion(form.questions[form.questions.length - 1]?.section ?? "")])}>
              Add a question
            </button>
          )}
          {library && form.questions.length < LIMITS.questions && (
            <button type="button" className={secondary} onClick={() => setPicking(true)}>Add from library</button>
          )}
        </div>
        {picking && library && (
          <LibraryPicker
            klymb={library.klymb}
            mine={library.mine}
            room={LIMITS.questions - (form.questions.length === 1 && isBlank(form.questions[0]) ? 0 : form.questions.length)}
            onAdd={addFromLibrary}
            onClose={() => setPicking(false)}
          />
        )}
        {!skills.length && !title && <p className="text-xs text-muted">This item has no skills in the catalog yet. Add them on the Business catalog page to choose one here.</p>}
      </section>

      <section className="flex flex-col gap-4" aria-labelledby="ae-practice">
        <h2 id="ae-practice" className={h2}>Practice task</h2>
        <p className="-mt-2 text-xs text-muted">Shown before the test, so people can prepare. Make it different from the real questions.</p>
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
              ? revision === 0 ? (newNote ?? "Not saved yet. This draft starts from the catalog listing.") : "Unsaved changes."
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
