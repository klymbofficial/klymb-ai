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
