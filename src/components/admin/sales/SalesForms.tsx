"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createLead, deleteLead, importLeads, logTouch, saveTarget, updateLead, type LeadInput } from "@/app/admin/sales-actions";
import { CHANNELS, SOURCES, STAGES } from "@/lib/sales";

export const input = "border border-line/60 bg-white px-3 py-2 text-sm focus:border-ink focus:outline-none";
const label = "flex flex-col gap-1 text-xs font-bold";
const button = "bg-ink px-4 py-2 text-xs font-bold uppercase tracking-wider text-paper disabled:opacity-50";

interface Owner { email: string; name: string | null }
type Msg = { ok: boolean; text: string } | null;

function Note({ msg }: { msg: Msg }) {
  if (!msg) return null;
  return <p role={msg.ok ? "status" : "alert"} className={`w-full text-xs font-semibold ${msg.ok ? "text-ink" : "text-error"}`}>{msg.text}</p>;
}

function OwnerSelect({ owners, value, onChange, name = "Owner" }: { owners: Owner[]; value: string; onChange: (v: string) => void; name?: string }) {
  return (
    <label className={label}>
      {name}
      <select value={value} onChange={(e) => onChange(e.target.value)} className={input}>
        <option value="">Unassigned</option>
        {owners.map((o) => <option key={o.email} value={o.email}>{o.name ?? o.email}</option>)}
      </select>
    </label>
  );
}

const blank: LeadInput = { name: "", phone: "", email: "", kind: "b2c", source: "socials", source_detail: "", org: "", owner_email: "", next_follow_up: "", notes: "" };

/** Add a lead, or edit one when `lead` is given. */
export function LeadForm({ owners, me, lead }: { owners: Owner[]; me: string; lead?: LeadInput & { id: string; stage: string } }) {
  const router = useRouter();
  const [v, setV] = useState<LeadInput & { stage: string }>(lead ?? { ...blank, owner_email: me, stage: "new" });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);
  const set = (k: keyof typeof v) => (e: { target: { value: string } }) => setV({ ...v, [k]: e.target.value });

  return (
    <form
      className="card grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setMsg(null);
        const r = lead ? await updateLead(lead.id, v) : await createLead(v);
        setBusy(false);
        if (!r.ok) return setMsg({ ok: false, text: r.message });
        if (lead) setMsg({ ok: true, text: "Saved." });
        else router.push(`/admin/sales/leads/${r.id}`);
      }}
    >
      <label className={label}>Name<input required value={v.name} onChange={set("name")} className={input} /></label>
      <label className={label}>Phone<input value={v.phone} onChange={set("phone")} inputMode="tel" placeholder="98765 43210" className={input} /></label>
      <label className={label}>Email<input type="email" value={v.email} onChange={set("email")} className={input} /></label>
      <label className={label}>
        Type
        <select value={v.kind} onChange={set("kind")} className={input}>
          <option value="b2c">Student / professional</option>
          <option value="b2b">B2B (college, company)</option>
        </select>
      </label>
      <label className={label}>
        Source
        <select value={v.source} onChange={set("source")} className={input}>
          {SOURCES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
      </label>
      <label className={label}>Source detail<input value={v.source_detail} onChange={set("source_detail")} placeholder="ViCodathon, Batch 2…" className={input} /></label>
      <label className={label}>College / company<input value={v.org} onChange={set("org")} className={input} /></label>
      <OwnerSelect owners={owners} value={v.owner_email} onChange={(owner_email) => setV({ ...v, owner_email })} />
      {lead && (
        <label className={label}>
          Stage
          <select value={v.stage} onChange={set("stage")} className={input}>
            {STAGES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
        </label>
      )}
      <label className={label}>Next follow-up<input type="date" value={v.next_follow_up} onChange={set("next_follow_up")} className={input} /></label>
      <label className={`${label} sm:col-span-2`}>Notes<textarea value={v.notes} onChange={set("notes")} rows={2} className={input} /></label>
      <div className="flex items-end gap-3 sm:col-span-2 lg:col-span-4">
        <button type="submit" disabled={busy} className={button}>{busy ? "Saving…" : lead ? "Save lead" : "Add lead"}</button>
        <Note msg={msg} />
      </div>
    </form>
  );
}

/** Log one outreach, and optionally move the stage and set the next follow-up. */
export function TouchForm({ leadId, stage }: { leadId: string; stage: string }) {
  const [channel, setChannel] = useState("whatsapp");
  const [replied, setReplied] = useState(false);
  const [note, setNote] = useState("");
  const [nextStage, setNextStage] = useState("");
  const [follow, setFollow] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);

  return (
    <form
      className="card flex flex-col gap-4 p-5"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setMsg(null);
        const r = await logTouch(leadId, { channel, replied, note, stage: nextStage, next_follow_up: follow });
        setBusy(false);
        if (!r.ok) return setMsg({ ok: false, text: r.message });
        setMsg({ ok: true, text: "Logged." });
        setNote(""); setReplied(false); setNextStage(""); setFollow("");
      }}
    >
      <h2 className="display text-xl">Log outreach</h2>
      <div role="group" aria-label="Channel" className="flex flex-wrap gap-1.5">
        {CHANNELS.map((c) => (
          <button
            key={c.key}
            type="button"
            aria-pressed={channel === c.key}
            onClick={() => setChannel(c.key)}
            className={`border px-3 py-1.5 text-xs font-bold ${channel === c.key ? "border-ink bg-ink text-paper" : "border-line/50 hover:bg-surface"}`}
          >
            {c.label}
          </button>
        ))}
      </div>
      <label className="flex items-center gap-2 text-sm font-semibold">
        <input type="checkbox" checked={replied} onChange={(e) => setReplied(e.target.checked)} className="size-4 accent-[var(--color-ink)]" />
        They replied or we talked (counts as a conversation)
      </label>
      <label className={label}>What happened<textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Asked about EMI, call back after exams" className={input} /></label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className={label}>
          Move to stage
          <select value={nextStage} onChange={(e) => setNextStage(e.target.value)} className={input}>
            <option value="">Keep: {STAGES.find((s) => s.key === stage)?.label}</option>
            {STAGES.filter((s) => s.key !== stage).map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
        </label>
        <label className={label}>Next follow-up<input type="date" value={follow} onChange={(e) => setFollow(e.target.value)} className={input} /></label>
      </div>
      <div className="flex items-center gap-3">
        <button type="submit" disabled={busy} className={button}>{busy ? "Logging…" : "Log it"}</button>
        <Note msg={msg} />
      </div>
    </form>
  );
}

export function ImportLeads({ owners, me }: { owners: Owner[]; me: string }) {
  const [csv, setCsv] = useState("");
  const [file, setFile] = useState("");
  const [source, setSource] = useState("bought");
  const [detail, setDetail] = useState("");
  const [owner, setOwner] = useState(me);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);
  const [skipped, setSkipped] = useState<{ line: number; reason: string }[]>([]);

  return (
    <form
      className="card flex flex-col gap-4 p-5"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!csv) return setMsg({ ok: false, text: "Choose a CSV file first." });
        setBusy(true);
        setMsg(null);
        const r = await importLeads(csv, { source, source_detail: detail, owner_email: owner });
        setBusy(false);
        if (!r.ok) return setMsg({ ok: false, text: r.message });
        setSkipped(r.skipped);
        const n = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;
        setMsg({
          ok: true,
          text: `Added ${n(r.added, "lead", "leads")}. ${n(r.existing, "was", "were")} already here and left as they are. ${n(r.skipped.length, "row", "rows")} skipped.`,
        });
        setCsv(""); setFile("");
      }}
    >
      <div>
        <h2 className="display text-xl">Import a CSV</h2>
        <p className="mt-1 text-xs text-muted">
          First row is the header. Needs <b>name</b> and <b>phone</b> or <b>email</b>. Optional: source, source detail, college, stage, notes.
          Works with a Google Sheet download or a WhatsApp dashboard export. Leads already here are never overwritten.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className={label}>
          File
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              setFile(f?.name ?? "");
              setCsv(f ? await f.text() : "");
            }}
            className="text-xs"
          />
        </label>
        <label className={label}>
          Source (when the file has none)
          <select value={source} onChange={(e) => setSource(e.target.value)} className={input}>
            {SOURCES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
        </label>
        <label className={label}>Source detail<input value={detail} onChange={(e) => setDetail(e.target.value)} placeholder="WhatsApp Batch 2" className={input} /></label>
        <OwnerSelect owners={owners} value={owner} onChange={setOwner} name="Assign to" />
      </div>
      <div className="flex items-center gap-3">
        <button type="submit" disabled={busy || !csv} className={button}>{busy ? "Importing…" : file ? `Import ${file}` : "Import"}</button>
        <Note msg={msg} />
      </div>
      {skipped.length > 0 && (
        <details className="text-xs text-muted">
          <summary className="cursor-pointer font-bold">Skipped rows</summary>
          <ul className="mt-2 columns-2">{skipped.slice(0, 200).map((s) => <li key={s.line}>Row {s.line}: {s.reason}</li>)}</ul>
        </details>
      )}
    </form>
  );
}

export function DeleteLead({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");
  if (!confirming) {
    return <button type="button" onClick={() => setConfirming(true)} className="text-xs font-bold text-error underline underline-offset-4">Delete lead</button>;
  }
  return (
    <span className="flex items-center gap-3 text-xs">
      <span>Delete {name} and their outreach history? This can&apos;t be undone.</span>
      <button
        type="button"
        onClick={async () => {
          const r = await deleteLead(id);
          if (r.ok) router.push("/admin/sales/leads");
          else setError(r.message);
        }}
        className="bg-error px-3 py-1.5 font-bold text-white"
      >
        Delete
      </button>
      <button type="button" onClick={() => setConfirming(false)} className="font-bold underline">Cancel</button>
      {error && <span role="alert" className="text-error">{error}</span>}
    </span>
  );
}

export function TargetEditor({ month, label: monthLabel, initial }: { month: string; label: string; initial: { enrolments: number; b2b: number; hackathons: number; webinars: number } | null }) {
  const [open, setOpen] = useState(false);
  const [v, setV] = useState(initial ?? { enrolments: 0, b2b: 0, hackathons: 0, webinars: 0 });
  const [msg, setMsg] = useState<Msg>(null);
  if (!open) {
    return <button type="button" onClick={() => setOpen(true)} className="text-xs font-bold underline underline-offset-4">{initial ? "Edit target" : "Set a target"}</button>;
  }
  const field = (k: keyof typeof v, name: string) => (
    <label className={label}>{name}<input type="number" min={0} value={v[k]} onChange={(e) => setV({ ...v, [k]: Number(e.target.value) })} className={`${input} w-24`} /></label>
  );
  return (
    <form
      className="flex flex-wrap items-end gap-3"
      onSubmit={async (e) => {
        e.preventDefault();
        const r = await saveTarget(month, v);
        setMsg(r.ok ? { ok: true, text: `Saved the ${monthLabel} target.` } : { ok: false, text: r.message });
        if (r.ok) setOpen(false);
      }}
    >
      {field("enrolments", "Enrolments")}{field("b2b", "B2B deals")}{field("hackathons", "Hackathons")}{field("webinars", "Webinars")}
      <button type="submit" className={button}>Save</button>
      <Note msg={msg} />
    </form>
  );
}
