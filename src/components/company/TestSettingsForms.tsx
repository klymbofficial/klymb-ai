"use client";

import { useState, useTransition } from "react";
import type { SettingsResult } from "@/app/org/[slug]/(workspace)/assessments/settings-actions";
import { BTN_PRIMARY, BTN_SECONDARY } from "@/components/company/HiringParts";
import { SETTINGS_LIMITS, TEMPLATE_VARS, renderTemplate, unknownVars, type TemplateVar } from "@/lib/company/test-settings";

const input = "w-full rounded-md border-2 border-line/50 bg-white px-3 py-2 text-sm focus:border-ink";
const label = "flex flex-col gap-1 text-sm font-bold";

type Save = (expected: number, form: Record<string, unknown>) => Promise<SettingsResult>;

function useSave(save: Save, start: number) {
  const [revision, setRevision] = useState(start);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, go] = useTransition();
  const run = (form: Record<string, unknown>, after?: () => void) =>
    go(async () => {
      setMsg(null);
      try {
        const out = await save(revision, form);
        setMsg({ ok: out.ok, text: out.message });
        if (out.ok) { setRevision(out.revision); after?.(); }
      } catch {
        setMsg({ ok: false, text: "That didn't save just now. Try again in a minute." });
      }
    });
  const note = msg && <p role={msg.ok ? "status" : "alert"} className={`text-sm font-semibold ${msg.ok ? "" : "text-error"}`}>{msg.text}</p>;
  return { run, pending, note };
}

/** Access, end date and tags for this company's use of the test. */
export function BasicSettingsForm({
  save, revision, accessOpen, endsOnInput, tags, zoneLabel,
}: {
  save: Save;
  revision: number;
  accessOpen: boolean;
  /** datetime-local in the zone named by zoneLabel, or "". */
  endsOnInput: string;
  tags: string[];
  zoneLabel: string;
}) {
  const [open, setOpen] = useState(accessOpen);
  const [ends, setEnds] = useState(endsOnInput);
  const [tagText, setTagText] = useState(tags.join(", "));
  const { run, pending, note } = useSave(save, revision);
  return (
    <form
      className="flex max-w-xl flex-col gap-5"
      onSubmit={(e) => { e.preventDefault(); run({ accessOpen: open, endsOn: ends, tags: tagText }); }}
    >
      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" checked={open} onChange={(e) => setOpen(e.target.checked)} className="mt-1" />
        <span>
          <span className="font-bold">Test access</span>
          <span className="block text-muted">{open ? "On: people you invite can start." : "Off: nobody can be invited or start. Anyone already taking it finishes."}</span>
        </span>
      </label>
      <label className={label}>
        Ends on <span className="font-normal text-muted">(optional, {zoneLabel}) — nobody starts after it</span>
        <span className="flex gap-2">
          <input type="datetime-local" value={ends} onChange={(e) => setEnds(e.target.value)} className={input} />
          {ends && <button type="button" onClick={() => setEnds("")} className={BTN_SECONDARY}>Clear</button>}
        </span>
      </label>
      <label className={label}>
        Tags <span className="font-normal text-muted">(comma-separated, up to {SETTINGS_LIMITS.tags}; shown on the Assessments list)</span>
        <input value={tagText} onChange={(e) => setTagText(e.target.value)} placeholder="e.g. Campus 2026, Data team" className={input} />
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className={BTN_PRIMARY}>{pending ? "Saving…" : "Save"}</button>
        {note}
      </div>
    </form>
  );
}

const SAMPLE: Record<TemplateVar, string> = {
  candidate_name: "Asha Rao",
  test_name: "",
  company: "",
  start_by: "Fri 4 Dec 2026, 6:00 pm India Standard Time",
  time_allowed: "45 minutes",
};

/** The automatic reminder, and the invitation in the company's own words with a live preview. */
export function EmailSettingsForm({
  save, revision, autoRemind, subject, body, testName, company, remindEvery,
}: {
  save: Save;
  revision: number;
  autoRemind: boolean;
  subject: string;
  body: string;
  testName: string;
  company: string;
  remindEvery: string;
}) {
  const [remind, setRemind] = useState(autoRemind);
  const [subj, setSubj] = useState(subject);
  const [text, setText] = useState(body);
  const { run, pending, note } = useSave(save, revision);
  const custom = !!(subj.trim() || text.trim());
  const bad = unknownVars(`${subj}\n${text}`);
  const vars = { ...SAMPLE, test_name: testName, company };
  const insert = (v: string) => setText((t) => `${t}${t && !t.endsWith(" ") && !t.endsWith("\n") ? " " : ""}{{${v}}}`);

  return (
    <form className="flex max-w-2xl flex-col gap-6" onSubmit={(e) => { e.preventDefault(); run({ autoRemind: remind, inviteSubject: subj, inviteBody: text }); }}>
      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" checked={remind} onChange={(e) => setRemind(e.target.checked)} className="mt-1" />
        <span>
          <span className="font-bold">Automatic reminder</span>
          <span className="block text-muted">{remind ? `On: people who haven't started get a reminder ${remindEvery}.` : "Off: only the reminders you send by hand go out."}</span>
        </span>
      </label>

      <fieldset className="flex flex-col gap-4 border-t border-line/30 pt-5">
        <legend className="text-sm font-bold">Invitation email</legend>
        <p className="-mt-2 text-sm text-muted">
          Leave both empty for the standard invitation. Your words replace the subject and the opening; the start time, time allowed,
          the button with their own link, and your help line are always added.
        </p>
        <label className={label}>
          Subject
          <input value={subj} onChange={(e) => setSubj(e.target.value)} maxLength={SETTINGS_LIMITS.subject} placeholder="e.g. {{company}}: your {{test_name}} assessment" className={input} />
        </label>
        <label className={label}>
          Message
          <textarea value={text} onChange={(e) => setText(e.target.value)} maxLength={SETTINGS_LIMITS.body} rows={6} className={input} />
        </label>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="font-bold text-muted">Insert:</span>
          {(Object.keys(TEMPLATE_VARS) as TemplateVar[]).map((v) => (
            <button key={v} type="button" title={TEMPLATE_VARS[v]} onClick={() => insert(v)} className="rounded border border-line/50 px-2 py-1 font-mono hover:border-ink">{`{{${v}}}`}</button>
          ))}
        </div>
        {bad.length > 0 && <p role="alert" className="text-sm font-semibold text-error">{`{{${bad[0]}}}`} isn&apos;t a variable.</p>}
        {custom && (
          <div className="rounded-md border border-line/40 bg-white p-4 text-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-muted">Preview, for a sample person</p>
            <p className="mt-2"><span className="text-muted">Subject:</span> <strong>{renderTemplate(subj, vars) || "—"}</strong></p>
            <p className="mt-3">Hi {SAMPLE.candidate_name}.</p>
            <p className="mt-2 whitespace-pre-line">{renderTemplate(text, vars) || "—"}</p>
            <p className="mt-3 text-xs text-muted">Then: start by, time allowed, the “Open your assessment” button with their own link, and your help line.</p>
          </div>
        )}
      </fieldset>

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending || bad.length > 0} className={BTN_PRIMARY}>{pending ? "Saving…" : "Save"}</button>
        {custom && <button type="button" onClick={() => { setSubj(""); setText(""); }} className={BTN_SECONDARY}>Use the standard email</button>}
        {note}
      </div>
    </form>
  );
}

/** The cut-off, with a suggestion once enough people are reviewed, and the details asked before Start (U06b). */
export function CandidateSettingsForm({
  save, revision, cutoffPercent, collect, suggested, reviewed, fields,
}: {
  save: Save;
  revision: number;
  cutoffPercent: number | null;
  collect: string[];
  /** The median reviewed score, or null below the minimum. */
  suggested: number | null;
  reviewed: number;
  /** Every field a company may ask for, in order. */
  fields: { key: string; label: string }[];
}) {
  const [cut, setCut] = useState(cutoffPercent === null ? "" : String(cutoffPercent));
  const [asked, setAsked] = useState<string[]>(collect);
  const { run, pending, note } = useSave(save, revision);
  return (
    <form className="flex max-w-xl flex-col gap-6" onSubmit={(e) => { e.preventDefault(); run({ cutoffPercent: cut, collect: asked }); }}>
      <label className={label}>
        Cut-off score <span className="font-normal text-muted">(percent of the total; empty for none; never shown to candidates)</span>
        <span className="flex items-center gap-2">
          <input type="number" min={0} max={100} step={1} inputMode="numeric" value={cut} onChange={(e) => setCut(e.target.value)} className={`${input} max-w-28`} />
          <span className="text-sm font-normal">%</span>
          {suggested !== null && String(suggested) !== cut && (
            <button type="button" onClick={() => setCut(String(suggested))} className={BTN_SECONDARY}>Use {suggested}%</button>
          )}
        </span>
        <span className="text-xs font-normal text-muted">
          {suggested !== null
            ? `Suggested: ${suggested}%, the middle score of the ${reviewed} people reviewed so far.`
            : `A suggestion appears once 5 people are reviewed (${reviewed} so far).`}{" "}
          Reviewed candidates are marked cleared or below it.
        </span>
      </label>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-bold">Ask before they start <span className="font-normal text-muted">(name and email are always known)</span></legend>
        {fields.map((f) => (
          <label key={f.key} className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={asked.includes(f.key)} onChange={(e) => setAsked((a) => (e.target.checked ? [...a, f.key] : a.filter((x) => x !== f.key)))} />
            {f.label}
          </label>
        ))}
        <p className="text-xs text-muted">Each is required. People who already started aren&apos;t asked.</p>
      </fieldset>

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className={BTN_PRIMARY}>{pending ? "Saving…" : "Save"}</button>
        {note}
      </div>
    </form>
  );
}

/** Proctoring (0070): what the test window enforces, and the warning limit. */
export function ProctorSettingsForm({ save, revision, initial }: {
  save: Save;
  revision: number;
  initial: { fullscreen: boolean; tabs: boolean; copy: boolean; webcam: boolean; limit: number | null };
}) {
  const [p, setP] = useState(initial);
  const [limit, setLimit] = useState(initial.limit === null ? "" : String(initial.limit));
  const { run, pending, note } = useSave(save, revision);
  const flip = (k: "fullscreen" | "tabs" | "copy" | "webcam") => (e: React.ChangeEvent<HTMLInputElement>) => setP((x) => ({ ...x, [k]: e.target.checked }));
  const rows: [keyof typeof p & string, string, string][] = [
    ["fullscreen", "Require full screen", "The test runs in full screen. Leaving it shows a warning and is recorded."],
    ["tabs", "Detect tab or window switch", "Leaving the test tab or window shows a warning and is recorded."],
    ["copy", "Block copy, paste and right-click", "Stops copying questions out and pasting answers in. Attempts are recorded."],
    ["webcam", "Webcam snapshots", "With the candidate's consent, a photo every 2 minutes, seen only by your reviewers. Refusing the camera is recorded."],
  ];
  const counts = p.fullscreen || p.tabs;
  return (
    <form className="flex max-w-xl flex-col gap-5" onSubmit={(e) => { e.preventDefault(); run({ ...p, limit }); }}>
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 text-sm font-bold">Proctoring</legend>
        {rows.map(([k, title, hint]) => (
          <label key={k} className="flex items-start gap-3 text-sm">
            <input type="checkbox" checked={p[k as "fullscreen"]} onChange={flip(k as "fullscreen")} className="mt-1" />
            <span><span className="font-bold">{title}</span><span className="block text-muted">{hint}</span></span>
          </label>
        ))}
      </fieldset>
      <label className={label}>
        Submit automatically after <span className="font-normal text-muted">(warnings: full-screen exits and tab or window switches; empty for never)</span>
        <span className="flex items-center gap-2">
          <input type="number" min={1} max={20} step={1} inputMode="numeric" value={limit} disabled={!counts} onChange={(e) => setLimit(e.target.value)} className={`${input} max-w-28`} />
          <span className="text-sm font-normal">warnings</span>
        </span>
        {!counts && <span className="text-xs font-normal text-muted">Switch on full screen or tab detection to use a limit.</span>}
      </label>
      <p className="text-xs text-muted">Candidates are told what is checked before they start. A browser can&apos;t stop every workaround, so treat these as signals for the reviewer, not proof.</p>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className={BTN_PRIMARY}>{pending ? "Saving…" : "Save"}</button>
        {note}
      </div>
    </form>
  );
}
