"use client";

import clsx from "clsx";
import { useState, useTransition } from "react";
import type { SettingsResult } from "@/app/org/[slug]/(workspace)/assessments/settings-actions";
import { BTN_PRIMARY, BTN_SECONDARY } from "@/components/company/HiringParts";
import { SETTINGS_LIMITS, TEMPLATE_VARS, renderTemplate, unknownVars, type TemplateVar } from "@/lib/company/test-settings";

/**
 * A test's Settings tab, laid out like HackerEarth's (user, 26 Nov): blue
 * switches that save as soon as they're flipped, and values with a pencil or
 * "Edit" that open in place. Every section saves to the same settings row,
 * so they share one revision: a save here never trips over a save there.
 * Anyone who can't change settings sees the same page, switched off.
 */

const input = "w-full rounded-md border border-line/50 bg-white px-3 py-2 text-sm focus:border-[#1f4fd1] focus:outline-none";
const EDIT = "inline-flex items-center gap-1 text-sm font-semibold text-[#1f4fd1] hover:underline disabled:opacity-50";

type Save = (expected: number, form: Record<string, unknown>) => Promise<SettingsResult>;

export interface SettingsValues {
  revision: number;
  accessOpen: boolean;
  /** datetime-local in India time, or "". */
  endsOnInput: string;
  endsOnText: string | null;
  tags: string[];
  autoRemind: boolean;
  subject: string;
  body: string;
  cutoffPercent: number | null;
  collect: string[];
  proctor: { fullscreen: boolean; tabs: boolean; copy: boolean; webcam: boolean; limit: number | null; shuffle: boolean; watermark: boolean; integrity: boolean };
}

export interface PanelInfo {
  testName: string;
  role: string;
  itemSlug: string;
  editHref: string | null;
  company: string;
  remindEvery: string;
  resultReport: string;
  suggested: number | null;
  reviewed: number;
  fields: { key: string; label: string }[];
}

export type SettingsSection = "basic" | "proctoring" | "candidate" | "email" | "templates";

/** The one revision every section saves against, and a message per section. */
function useSettingsSave(start: number) {
  const [revision, setRevision] = useState(start);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, go] = useTransition();
  const run = (save: Save, form: Record<string, unknown>, after?: (ok: boolean) => void) =>
    go(async () => {
      setMsg(null);
      try {
        const out = await save(revision, form);
        setMsg({ ok: out.ok, text: out.message });
        if (out.ok) setRevision(out.revision);
        after?.(out.ok);
      } catch {
        setMsg({ ok: false, text: "That didn't save just now. Try again in a minute." });
        after?.(false);
      }
    });
  const note = msg && <p role={msg.ok ? "status" : "alert"} className={clsx("text-sm font-semibold", msg.ok ? "text-[#14532d]" : "text-error")}>{msg.text}</p>;
  return { run, pending, note };
}

/** HackerEarth's blue pill switch. */
function Toggle({ on, label, disabled, onChange }: { on: boolean; label: string; disabled?: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!on)}
      className={clsx("relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50", on ? "bg-[#1f4fd1]" : "bg-[#c9c7c6]")}
    >
      <span className={clsx("inline-block h-[18px] w-[18px] rounded-full bg-white shadow transition-transform", on ? "translate-x-[23px]" : "translate-x-[3px]")} />
    </button>
  );
}

function SwitchRow({ title, hint, on, disabled, onChange, children }: { title: string; hint: React.ReactNode; on: boolean; disabled?: boolean; onChange: (v: boolean) => void; children?: React.ReactNode }) {
  return (
    <div className="flex items-start gap-4 py-3">
      <span className="pt-0.5"><Toggle on={on} label={title} disabled={disabled} onChange={onChange} /></span>
      <div className="min-w-0">
        <p className="text-sm font-semibold">{title}</p>
        <p className="mt-0.5 text-sm text-muted">{hint}</p>
        {children}
      </div>
    </div>
  );
}

const Pencil = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4z" /></svg>
);
const Check = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#15803d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="mt-0.5 shrink-0"><circle cx="12" cy="12" r="9" /><path d="M8 12.5l2.5 2.5L16 9.5" /></svg>
);
const CopyIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h8" /></svg>
);

/** A label over a value, as HackerEarth's Basic test setting lists them. */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="py-2.5">
      <p className="text-sm text-muted">{label}</p>
      <div className="mt-1 text-sm">{children}</div>
    </div>
  );
}

export function TestSettingsPanel({
  section, values, canEdit, saveBasic, saveProctor, saveCandidate, saveEmail, info,
}: {
  section: SettingsSection;
  values: SettingsValues;
  canEdit: boolean;
  saveBasic: Save;
  saveProctor: Save;
  saveCandidate: Save;
  saveEmail: Save;
  info: PanelInfo;
}) {
  const { run, pending, note } = useSettingsSave(values.revision);
  const [v, setV] = useState(values);
  const off = !canEdit || pending;

  // Each section sends its whole group; the switch shows the new value at once and goes back if the save fails.
  const basicForm = (x: SettingsValues) => ({ accessOpen: x.accessOpen, endsOn: x.endsOnInput, tags: x.tags.join(", ") });
  const proctorForm = (x: SettingsValues) => ({ ...x.proctor, limit: x.proctor.limit === null ? "" : String(x.proctor.limit) });
  const candidateForm = (x: SettingsValues) => ({ cutoffPercent: x.cutoffPercent === null ? "" : String(x.cutoffPercent), collect: x.collect });
  const emailForm = (x: SettingsValues) => ({ autoRemind: x.autoRemind, inviteSubject: x.subject, inviteBody: x.body });
  const apply = (next: SettingsValues, save: Save, form: (x: SettingsValues) => Record<string, unknown>, after?: (ok: boolean) => void) => {
    const before = v;
    setV(next);
    run(save, form(next), (ok) => { if (!ok) setV(before); after?.(ok); });
  };

  const readOnly = !canEdit && <p className="mb-4 rounded-md bg-paper px-3 py-2 text-xs text-muted">Only an admin or a recruiter can change these settings.</p>;

  const c: Ctx = { v, apply, pending, note, canEdit, info, readOnly, off, values, saveBasic, saveProctor, saveCandidate, saveEmail, basicForm, proctorForm, candidateForm, emailForm };
  if (section === "basic") return <Basic c={c} />;
  if (section === "proctoring") return <Proctoring c={c} />;
  if (section === "candidate") return <Candidate c={c} />;
  if (section === "email") return <Email c={c} />;
  return <Templates c={c} />;
}

type Form = (x: SettingsValues) => Record<string, unknown>;
interface Ctx {
  v: SettingsValues;
  values: SettingsValues;
  apply: (next: SettingsValues, save: Save, form: Form, after?: (ok: boolean) => void) => void;
  pending: boolean;
  note: React.ReactNode;
  canEdit: boolean;
  off: boolean;
  readOnly: React.ReactNode;
  info: PanelInfo;
  saveBasic: Save; saveProctor: Save; saveCandidate: Save; saveEmail: Save;
  basicForm: Form; proctorForm: Form; candidateForm: Form; emailForm: Form;
}

function Basic({ c }: { c: Ctx }) {
  const { v, apply, pending, note, canEdit, info, readOnly, off, values, saveBasic, basicForm } = c;
  const [editing, setEditing] = useState<null | "ends" | "tags">(null);
  const [ends, setEnds] = useState(v.endsOnInput);
  const [tagText, setTagText] = useState("");
  const [copied, setCopied] = useState(false);
  return (
    <div className="max-w-2xl">
      {readOnly}
      <h2 className="mb-2 text-base font-semibold">Other details</h2>
      <Field label="Test name">
        <span className="inline-flex items-center gap-2">{info.testName}{info.editHref && <a href={info.editHref} className={EDIT} aria-label="Edit the test's name and questions"><Pencil /></a>}</span>
      </Field>
      <Field label="Role">{info.role}</Field>
      <Field label="Test access">
        <span className="inline-flex items-center gap-3">
          <Toggle on={v.accessOpen} label="Test access" disabled={off} onChange={(on) => apply({ ...v, accessOpen: on }, saveBasic, basicForm)} />
          <span>{v.accessOpen ? "On" : "Off: nobody can be invited or start. Anyone already taking it finishes."}</span>
        </span>
      </Field>
      <Field label="Ends on">
        {editing === "ends" ? (
          <span className="flex flex-wrap items-center gap-2">
            <input type="datetime-local" value={ends} onChange={(e) => setEnds(e.target.value)} className={`${input} max-w-64`} aria-label="Ends on, India Standard Time" />
            <button type="button" disabled={pending} onClick={() => apply({ ...v, endsOnInput: ends }, saveBasic, basicForm, (ok) => ok && setEditing(null))} className={BTN_PRIMARY}>Save</button>
            {ends && <button type="button" onClick={() => setEnds("")} className={BTN_SECONDARY}>Clear</button>}
            <button type="button" onClick={() => { setEnds(v.endsOnInput); setEditing(null); }} className="text-sm font-semibold text-muted hover:text-ink">Cancel</button>
            <span className="w-full text-xs text-muted">India Standard Time. Nobody can start after it.</span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-2">
            {v.endsOnInput ? (values.endsOnInput === v.endsOnInput && values.endsOnText ? values.endsOnText : v.endsOnInput.replace("T", " ")) : "Set end date"}
            {canEdit && <button type="button" onClick={() => setEditing("ends")} className={EDIT} aria-label="Change the end date"><Pencil /></button>}
          </span>
        )}
      </Field>
      <Field label="Assessment ID">
        <span className="inline-flex items-center gap-2">
          <code className="rounded bg-paper px-1.5 py-0.5">{info.itemSlug}</code>
          <button type="button" onClick={() => { void navigator.clipboard?.writeText(info.itemSlug).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }); }} className={EDIT} aria-label="Copy the assessment ID"><CopyIcon /></button>
          {copied && <span role="status" className="text-xs text-muted">Copied</span>}
        </span>
      </Field>
      <Field label="Tags">
        <span className="flex flex-wrap items-center gap-2">
          {v.tags.map((t) => (
            <span key={t} className="inline-flex items-center gap-1 rounded-full bg-[#eef2fd] px-2.5 py-0.5 text-xs font-semibold text-[#1f4fd1]">
              {t}
              {canEdit && <button type="button" disabled={pending} onClick={() => apply({ ...v, tags: v.tags.filter((x) => x !== t) }, saveBasic, basicForm)} aria-label={`Remove tag ${t}`} className="text-[#1f4fd1]/70 hover:text-[#1f4fd1]">×</button>}
            </span>
          ))}
          {canEdit && (editing === "tags" ? (
            <form
              className="flex items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                const add = tagText.split(",").map((t) => t.trim()).filter((t) => t && !v.tags.includes(t));
                if (!add.length) return setEditing(null);
                apply({ ...v, tags: [...v.tags, ...add] }, saveBasic, basicForm, (ok) => { if (ok) { setTagText(""); setEditing(null); } });
              }}
            >
              <input autoFocus value={tagText} onChange={(e) => setTagText(e.target.value)} placeholder="e.g. Campus 2026" className={`${input} max-w-52`} aria-label="New tag" />
              <button type="submit" disabled={pending} className={BTN_PRIMARY}>Add</button>
              <button type="button" onClick={() => setEditing(null)} className="text-sm font-semibold text-muted hover:text-ink">Cancel</button>
            </form>
          ) : (
            v.tags.length < SETTINGS_LIMITS.tags && <button type="button" onClick={() => setEditing("tags")} className={EDIT}>+ Add tags</button>
          ))}
          {!canEdit && !v.tags.length && <span className="text-muted">None</span>}
        </span>
      </Field>
      <div className="mt-2">{note}</div>
    </div>
  );
}

function Proctoring({ c }: { c: Ctx }) {
  const { v, apply, pending, note, canEdit, readOnly, off, saveProctor, proctorForm } = c;
  const p = v.proctor;
  const [limitEdit, setLimitEdit] = useState(false);
  const [limit, setLimit] = useState(p.limit === null ? "" : String(p.limit));
  const flip = (k: keyof typeof p) => (on: boolean) => {
    const next = { ...p, [k]: on };
    // A warning limit only counts full-screen exits and tab switches; it goes when both are off.
    if (!next.fullscreen && !next.tabs) next.limit = null;
    apply({ ...v, proctor: next }, saveProctor, proctorForm);
  };
  const counts = p.fullscreen || p.tabs;
  return (
    <div className="max-w-3xl">
      {readOnly}
      <div className="divide-y divide-line/15">
        <SwitchRow title="Enable Integrity Index" hint="Reviewers see a score from 0 to 100 for each candidate, worked out from the proctoring warnings during their test." on={p.integrity} disabled={off} onChange={flip("integrity")} />
        <SwitchRow title="Question watermarking" hint="The candidate's email shows faintly across the test, so screenshots and photos can be traced back to them." on={p.watermark} disabled={off} onChange={flip("watermark")} />
        <SwitchRow title="Enable random question shuffling" hint="Order of questions, and of multiple-choice options, changes for each candidate. Questions stay within their section." on={p.shuffle} disabled={off} onChange={flip("shuffle")} />
        <SwitchRow title="Require full screen" hint="The test runs in full screen. Leaving it shows the candidate a warning and is recorded." on={p.fullscreen} disabled={off} onChange={flip("fullscreen")} />
        <SwitchRow title="Detect tab or window switch" hint="Leaving the test tab or window shows a warning and is recorded." on={p.tabs} disabled={off} onChange={flip("tabs")} />
        <SwitchRow title="Disable copy and paste" hint="Copying questions out, pasting answers in and right-click are turned off. Attempts are recorded." on={p.copy} disabled={off} onChange={flip("copy")} />
        <SwitchRow title="Take candidates' snapshots during the test" hint="With the candidate's consent, a webcam photo every 2 minutes, seen only by your reviewers. Refusing the camera is recorded." on={p.webcam} disabled={off} onChange={flip("webcam")} />
        <div className="py-3 pl-[3.75rem]">
          <p className="flex flex-wrap items-center gap-2 text-sm font-semibold">
            Submit automatically after warnings
            {canEdit && counts && !limitEdit && <button type="button" onClick={() => setLimitEdit(true)} className={EDIT}>Edit</button>}
          </p>
          {limitEdit ? (
            <form className="mt-2 flex flex-wrap items-center gap-2" onSubmit={(e) => { e.preventDefault(); const n = limit.trim() ? Number(limit) : null; apply({ ...v, proctor: { ...p, limit: n } }, saveProctor, proctorForm, (ok) => ok && setLimitEdit(false)); }}>
              <input type="number" min={1} max={20} step={1} inputMode="numeric" value={limit} onChange={(e) => setLimit(e.target.value)} className={`${input} max-w-24`} aria-label="Warnings before automatic submission" />
              <span className="text-sm">warnings (empty for never)</span>
              <button type="submit" disabled={pending} className={BTN_PRIMARY}>Save</button>
              <button type="button" onClick={() => { setLimit(p.limit === null ? "" : String(p.limit)); setLimitEdit(false); }} className="text-sm font-semibold text-muted hover:text-ink">Cancel</button>
            </form>
          ) : (
            <p className="mt-0.5 text-sm text-muted">
              {!counts ? "Switch on full screen or tab detection to use a limit." : p.limit === null ? "Never: warnings are recorded, and the test isn't submitted for them." : `After ${p.limit} ${p.limit === 1 ? "warning" : "warnings"} (full-screen exits and tab or window switches), the test submits itself with the answers saved so far.`}
            </p>
          )}
        </div>
      </div>
      <p className="mt-4 text-xs text-muted">Candidates are told what is checked before they start. A browser can&apos;t stop every workaround, so treat these as signals for the reviewer, not proof.</p>
      <div className="mt-3">{note}</div>
    </div>
  );
}

function Candidate({ c }: { c: Ctx }) {
  const { v, apply, pending, note, canEdit, info, readOnly, saveCandidate, candidateForm } = c;
  const [editing, setEditing] = useState<null | "cutoff" | "collect">(null);
  const [cut, setCut] = useState(v.cutoffPercent === null ? "" : String(v.cutoffPercent));
  const [asked, setAsked] = useState<string[]>(v.collect);
  const labelOf = (k: string) => info.fields.find((f) => f.key === k)?.label ?? k;
  return (
    <div className="max-w-3xl">
      {readOnly}
      <section className="py-2">
        <h2 className="flex items-center gap-3 text-base font-semibold">Cut-off settings{canEdit && editing !== "cutoff" && <button type="button" onClick={() => setEditing("cutoff")} className={EDIT}>Edit</button>}</h2>
        {editing === "cutoff" ? (
          <form className="mt-3 flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); const n = cut.trim() === "" ? null : Number(cut); apply({ ...v, cutoffPercent: n }, saveCandidate, candidateForm, (ok) => ok && setEditing(null)); }}>
            <span className="flex flex-wrap items-center gap-2">
              <input type="number" min={0} max={100} step={1} inputMode="numeric" value={cut} onChange={(e) => setCut(e.target.value)} className={`${input} max-w-24`} aria-label="Cut-off score, percent" />
              <span className="text-sm">% of the total, empty for none</span>
              {info.suggested !== null && String(info.suggested) !== cut && <button type="button" onClick={() => setCut(String(info.suggested))} className={BTN_SECONDARY}>Use {info.suggested}%</button>}
            </span>
            <span className="flex gap-2">
              <button type="submit" disabled={pending} className={BTN_PRIMARY}>Save</button>
              <button type="button" onClick={() => { setCut(v.cutoffPercent === null ? "" : String(v.cutoffPercent)); setEditing(null); }} className="text-sm font-semibold text-muted hover:text-ink">Cancel</button>
            </span>
          </form>
        ) : (
          <div className="mt-3 flex items-start gap-3 text-sm">
            <Check />
            <div>
              <p>Cut-off score: <strong>{v.cutoffPercent === null ? "None" : `${v.cutoffPercent}%`}</strong></p>
              <p className="mt-0.5 text-muted">
                {info.suggested !== null ? `Suggested cut-off score: ${info.suggested}%, the middle score of the ${info.reviewed} people reviewed so far.` : `A suggested cut-off appears once 5 people are reviewed (${info.reviewed} so far).`}
              </p>
              <p className="mt-0.5 text-xs text-muted">Never shown to candidates. Reviewed candidates are marked cleared or below it.</p>
            </div>
          </div>
        )}
      </section>

      <section className="mt-6 py-2">
        <h2 className="flex items-center gap-3 text-base font-semibold">Candidate settings{canEdit && editing !== "collect" && <button type="button" onClick={() => setEditing("collect")} className={EDIT}>Edit</button>}</h2>
        {editing === "collect" ? (
          <form className="mt-3 flex flex-col gap-2" onSubmit={(e) => { e.preventDefault(); apply({ ...v, collect: info.fields.map((f) => f.key).filter((k) => asked.includes(k)) }, saveCandidate, candidateForm, (ok) => ok && setEditing(null)); }}>
            <p className="text-sm text-muted">Full name and email are always known. Ask these too, before they start:</p>
            {info.fields.map((f) => (
              <label key={f.key} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={asked.includes(f.key)} onChange={(e) => setAsked((a) => (e.target.checked ? [...a, f.key] : a.filter((x) => x !== f.key)))} />
                {f.label}
              </label>
            ))}
            <span className="mt-2 flex gap-2">
              <button type="submit" disabled={pending} className={BTN_PRIMARY}>Save</button>
              <button type="button" onClick={() => { setAsked(v.collect); setEditing(null); }} className="text-sm font-semibold text-muted hover:text-ink">Cancel</button>
            </span>
          </form>
        ) : (
          <div className="mt-3 flex items-start gap-3 text-sm">
            <Check />
            <div>
              <p>{["Full name", "Email", ...v.collect.map(labelOf)].join(", ")}</p>
              <p className="mt-0.5 text-muted">Information collected from candidates. Each extra detail is required; people who already started aren&apos;t asked.</p>
            </div>
          </div>
        )}
      </section>
      <div className="mt-3">{note}</div>
    </div>
  );
}

function Email({ c }: { c: Ctx }) {
  const { v, apply, note, info, readOnly, off, saveEmail, emailForm } = c;
  return (
    <div className="max-w-3xl">
      {readOnly}
      <div className="divide-y divide-line/15">
        <SwitchRow
          title="Automatic reminder emails"
          hint={v.autoRemind ? `People who haven't started get a reminder ${info.remindEvery}.` : "Off: only the reminders you send by hand go out."}
          on={v.autoRemind}
          disabled={off}
          onChange={(on) => apply({ ...v, autoRemind: on }, saveEmail, emailForm)}
        />
        <div className="py-3 pl-[3.75rem]">
          <p className="text-sm font-semibold">Candidate result report</p>
          <p className="mt-0.5 text-sm text-muted">{info.resultReport}. A recruiter shares it after the review; set it when you edit the test.</p>
        </div>
      </div>
      <div className="mt-3">{note}</div>
    </div>
  );
}

function Templates({ c }: { c: Ctx }) {
  const { v, apply, pending, note, canEdit, info, readOnly, saveEmail, emailForm } = c;
  const [subj, setSubj] = useState(v.subject);
  const [text, setText] = useState(v.body);
  const custom = !!(subj.trim() || text.trim());
  const bad = unknownVars(`${subj}\n${text}`);
  const vars = { ...SAMPLE, test_name: info.testName, company: info.company };
  const insert = (x: string) => setText((t) => `${t}${t && !t.endsWith(" ") && !t.endsWith("\n") ? " " : ""}{{${x}}}`);
  return (
    <form className="flex max-w-2xl flex-col gap-4" onSubmit={(e) => { e.preventDefault(); apply({ ...v, subject: subj, body: text }, saveEmail, emailForm); }}>
      {readOnly}
      <div>
        <h2 className="text-base font-semibold">Invitation email</h2>
        <p className="mt-1 text-sm text-muted">Leave both empty for the standard invitation. Your words replace the subject and the opening; the start time, time allowed, the button with their own link, and your help line are always added.</p>
      </div>
      <label className="flex flex-col gap-1 text-sm font-semibold">
        Subject
        <input value={subj} disabled={!canEdit} onChange={(e) => setSubj(e.target.value)} maxLength={SETTINGS_LIMITS.subject} placeholder="e.g. {{company}}: your {{test_name}} assessment" className={input} />
      </label>
      <label className="flex flex-col gap-1 text-sm font-semibold">
        Message
        <textarea value={text} disabled={!canEdit} onChange={(e) => setText(e.target.value)} maxLength={SETTINGS_LIMITS.body} rows={6} className={input} />
      </label>
      {canEdit && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="font-semibold text-muted">Insert:</span>
          {(Object.keys(TEMPLATE_VARS) as TemplateVar[]).map((x) => (
            <button key={x} type="button" title={TEMPLATE_VARS[x]} onClick={() => insert(x)} className="rounded border border-line/50 px-2 py-1 font-mono hover:border-[#1f4fd1]">{`{{${x}}}`}</button>
          ))}
        </div>
      )}
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
      {canEdit && (
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={pending || bad.length > 0} className={BTN_PRIMARY}>{pending ? "Saving…" : "Save"}</button>
          {custom && <button type="button" onClick={() => { setSubj(""); setText(""); }} className={BTN_SECONDARY}>Use the standard email</button>}
          {note}
        </div>
      )}
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

