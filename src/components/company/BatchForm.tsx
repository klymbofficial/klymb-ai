"use client";

import { PeoplePicker } from "@/components/company/PeoplePicker";
import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useState } from "react";
import { createHiringBatch } from "@/app/org/[slug]/(workspace)/hiring/actions";
import {
  BATCH_LIMITS, PREP_COURSES, allowedMinutes, deadlineText, durationText, lastStart, parseCandidates, zonedToUtc,
  type ApprovedTest, type BatchField, type ListProblem, type PickablePerson, type PrepCourse,
} from "@/lib/company/batch-rules";

const primary = "border-2 border-red-strong bg-red-strong px-5 py-2.5 text-sm font-bold text-white hover:border-red-press hover:bg-red-press disabled:opacity-50";
const input = "w-full border-2 border-line/50 bg-white px-3 py-2 text-sm focus:border-ink";
const label = "flex flex-col gap-1 text-xs font-bold";
const hint = "text-xs font-normal text-muted";

/**
 * A recruiter's new batch. Shows, as they type, the last moment anyone can
 * start and how long they have, and reads the invitee list line by line.
 * "Preview" saves a draft; nothing is sent from here.
 */
export function BatchForm({
  slug, tests, reviewers, prepCourses, timeZones, initial, company, onDirtyChange, onDone,
}: {
  /** In an overlay (P0.2c): told when people have been typed in, so closing asks first. */
  onDirtyChange?: (dirty: boolean) => void;
  /** In an overlay: called once the draft round is saved, before moving to it. */
  onDone?: () => void;
  slug: string;
  tests: ApprovedTest[];
  reviewers: { email: string; name: string | null }[];
  prepCourses: PrepCourse[];
  timeZones: string[];
  /** `test` is a catalog slug to choose first (from "Invite candidates" on a test); ignored when it isn't one of `tests`. */
  initial: { timeZone: string; opens: string; closes: string; test?: string; reviewer?: string };
  /** The company's people and teams, for "Add from your company". */
  company?: { people: PickablePerson[]; teams: { id: string; name: string; members: number }[] };
}) {
  const router = useRouter();
  const [requestKey] = useState(() => crypto.randomUUID());
  const [versionId, setVersionId] = useState(tests.find((t) => t.item === initial.test)?.versionId ?? (tests.length === 1 ? tests[0].versionId : ""));
  const test = tests.find((t) => t.versionId === versionId) ?? null;
  const [role, setRole] = useState(test?.role ?? "");
  const [roleTouched, setRoleTouched] = useState(false);
  const [prep, setPrep] = useState("");
  const [reviewer, setReviewer] = useState(reviewers.some((r) => r.email === initial.reviewer) ? initial.reviewer! : reviewers.length === 1 ? reviewers[0].email : "");
  const [timeZone, setTimeZone] = useState(initial.timeZone);
  const [opens, setOpens] = useState(initial.opens);
  const [closes, setCloses] = useState(initial.closes);
  const [list, setList] = useState("");
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<BatchField, string>>>({});
  const [problems, setProblems] = useState<ListProblem[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const id = useId();
  const internal = test?.audience === "internal";
  useEffect(() => { onDirtyChange?.(list.trim() !== ""); }, [list, onDirtyChange]);

  const parsed = useMemo(() => (list.trim() ? parseCandidates(list) : null), [list]);
  const timing = useMemo(() => {
    if (!test) return null;
    const close = zonedToUtc(closes, timeZone);
    const open = zonedToUtc(opens, timeZone);
    if (!close || !open) return null;
    const most = Math.max(0, ...(parsed?.candidates.map((c) => c.extraMinutes) ?? [0]));
    return {
      last: deadlineText(lastStart({ closesAt: close, minutes: test.minutes }, { extraMinutes: 0, lastStartAt: null }), timeZone),
      allowed: durationText(test.minutes),
      extra: most > 0 ? { allowed: durationText(allowedMinutes(test.minutes, most)), last: deadlineText(lastStart({ closesAt: close, minutes: test.minutes }, { extraMinutes: most, lastStartAt: null }), timeZone) } : null,
    };
  }, [test, opens, closes, timeZone, parsed]);

  function pickTest(v: string) {
    setVersionId(v);
    const t = tests.find((x) => x.versionId === v);
    if (t && !roleTouched) setRole(t.role);
  }

  async function readFile(file: File | undefined) {
    if (!file) return;
    if (file.size > BATCH_LIMITS.listBytes) { setErrors((e) => ({ ...e, candidates: "That file is too big. Add at most 200 people." })); return; }
    const text = await file.text();
    setList((prev) => (prev.trim() ? `${prev.trimEnd()}\n${text}` : text));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    const out = await createHiringBatch(slug, { requestKey, versionId, role, prepCourse: prep, reviewer, timeZone, opens, closes, candidates: list });
    if (out.ok) {
      onDone?.();
      // The new round opens on its test's Candidates tab, expanded, with Send and the invitation preview.
      router.push(`/org/${slug}/assessments/${test!.item}?tab=candidates&round=${out.id}#round-${out.id}`);
      return;
    }
    setBusy(false);
    setErrors(out.errors ?? {});
    setProblems(out.problems ?? []);
    setMessage(out.message);
  }

  const err = (f: BatchField) => errors[f] && <span role="alert" className="text-xs font-semibold text-error">{errors[f]}</span>;
  const shownProblems = parsed?.problems ?? problems;

  return (
    <form onSubmit={submit} noValidate className="flex max-w-3xl flex-col gap-8">
      <fieldset className="flex flex-col gap-4">
        <legend className="display mb-3 text-lg">The test</legend>
        <label className={label} htmlFor={`${id}-test`}>
          Test
          <select id={`${id}-test`} className={input} value={versionId} onChange={(e) => pickTest(e.target.value)}>
            {tests.length !== 1 && <option value="">Choose a test</option>}
            {tests.map((t) => (
              <option key={t.versionId} value={t.versionId}>{t.title} · version {t.version} · {durationText(t.minutes)}</option>
            ))}
          </select>
          <span className={hint}>
            {test
              ? internal
                ? "This is an internal employee assessment. Assigned employees see it under My assessments; no hiring decision is recorded."
                : "This is an external candidate assessment. Recruiters can review candidates and record hiring decisions."
              : "Only versions your reviewer approved are listed."}
          </span>
          {err("test")}
        </label>
        <label className={label} htmlFor={`${id}-role`}>
          {internal ? "Assessment label" : <>Role you&apos;re hiring for</>}
          <input id={`${id}-role`} className={input} value={role} maxLength={BATCH_LIMITS.role} onChange={(e) => { setRole(e.target.value); setRoleTouched(true); }} />
          {err("role")}
        </label>
        <label className={label} htmlFor={`${id}-reviewer`}>
          Reviewer
          <select id={`${id}-reviewer`} className={input} value={reviewer} onChange={(e) => setReviewer(e.target.value)}>
            {reviewers.length !== 1 && <option value="">Choose a reviewer</option>}
            {reviewers.map((r) => <option key={r.email} value={r.email}>{r.name ? `${r.name} (${r.email})` : r.email}</option>)}
          </select>
          <span className={hint}>They&apos;ll score the submissions.</span>
          {err("reviewer")}
        </label>
        {prepCourses.length > 0 && (
          <label className={label} htmlFor={`${id}-prep`}>
            Prep course (optional)
            <select id={`${id}-prep`} className={input} value={prep} onChange={(e) => setPrep(e.target.value)}>
              <option value="">None</option>
              {prepCourses.map((c) => <option key={c} value={c}>{PREP_COURSES[c]}</option>)}
            </select>
            <span className={hint}>Opens the course for each {internal ? "employee" : "candidate"} until the invitation window closes. They sign in with Google using the invited email.</span>
            {err("prep")}
          </label>
        )}
      </fieldset>

      <fieldset className="flex flex-col gap-4">
        <legend className="display mb-3 text-lg">When</legend>
        <label className={label} htmlFor={`${id}-tz`}>
          Time zone
          <select id={`${id}-tz`} className={input} value={timeZone} onChange={(e) => setTimeZone(e.target.value)}>
            {timeZones.map((z) => <option key={z} value={z}>{z.replace(/_/g, " ")}</option>)}
          </select>
          <span className={hint}>The times below, and in the invitation, are in this zone.</span>
          {err("timeZone")}
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className={label} htmlFor={`${id}-opens`}>
            Opens
            <input id={`${id}-opens`} type="datetime-local" className={input} value={opens} onChange={(e) => setOpens(e.target.value)} />
            {err("opens")}
          </label>
          <label className={label} htmlFor={`${id}-closes`}>
            Closes
            <input id={`${id}-closes`} type="datetime-local" className={input} value={closes} onChange={(e) => setCloses(e.target.value)} />
            {err("closes")}
          </label>
        </div>
        <div aria-live="polite" className="border-l-4 border-ink bg-white px-4 py-3 text-sm">
          {timing ? (
            <>
              <p><strong>Last start: {timing.last}.</strong> Anyone who starts by then gets their full {timing.allowed}; after it, the link won&apos;t start the test.</p>
              {timing.extra && <p className="mt-1 text-muted">People with extra time must start earlier: with {timing.extra.allowed}, by {timing.extra.last}.</p>}
            </>
          ) : (
            <p className="text-muted">Choose a test and both times to see the last start.</p>
          )}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className="display mb-3 text-lg">{internal ? "Employees" : "Candidates"}</legend>
        {company && <PeoplePicker people={company.people} teams={company.teams} list={list} onList={setList} />}
        <label className={label} htmlFor={`${id}-list`}>
          One {internal ? "employee" : "person"} per line: name, email
          <span className={hint}>Add a third value for extra minutes, e.g. an accessibility adjustment: <code>Asha Rao, asha@example.com, 30</code>. Up to {BATCH_LIMITS.candidates}.</span>
          <textarea id={`${id}-list`} rows={8} className={`${input} font-mono`} value={list} onChange={(e) => setList(e.target.value)} placeholder={"Asha Rao, asha@example.com\nRavi Menon, ravi@example.com, 30"} />
        </label>
        <label className="text-sm">
          <span className="font-bold underline underline-offset-4">Or add a CSV file</span>
          <span className="ml-2 text-xs text-muted">columns name, email, extra minutes</span>
          <input type="file" accept=".csv,text/csv" className="sr-only" onChange={(e) => { void readFile(e.target.files?.[0]); e.target.value = ""; }} />
        </label>
        {parsed && (
          <p className="text-sm font-semibold">
            {parsed.candidates.length === 1 ? "1 person" : `${parsed.candidates.length} people`} ready
            {parsed.problems.length > 0 && <span className="text-error"> · {parsed.problems.length === 1 ? "1 line" : `${parsed.problems.length} lines`} to fix</span>}
          </p>
        )}
        {shownProblems.length > 0 && (
          <ul className="flex flex-col gap-1 text-xs text-error">
            {shownProblems.slice(0, 20).map((p, i) => <li key={i}>{p.line ? `Line ${p.line}: ` : ""}{p.message}</li>)}
            {shownProblems.length > 20 && <li>And {shownProblems.length - 20} more.</li>}
          </ul>
        )}
        {err("candidates")}
      </fieldset>

      <div className="flex flex-wrap items-center gap-4 border-t border-line/25 pt-5">
        <button type="submit" className={primary} disabled={busy}>{busy ? "Saving…" : "Preview invitations"}</button>
        <span className="text-xs text-muted">Nothing is sent until you confirm on the next page.</span>
        {message && <p role="alert" className="w-full text-sm font-semibold text-error">{message}</p>}
      </div>
    </form>
  );
}
