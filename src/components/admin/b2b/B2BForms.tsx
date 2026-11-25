"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  addTask, createDeal, createWorkspace, deleteContact, deleteDeal, deleteTask, linkWorkspace, logActivity, saveCompany, saveContact,
  saveDoc, setDealStage, setStatusNote, setTaskDone, updateDeal,
  type CompanyInput, type ContactInput, type DealInput, type DocInput,
} from "@/app/admin/b2b-actions";
import { input } from "@/components/admin/sales/styles";
import {
  ACTIVITY_KINDS, B2B_SOURCES, B2B_STAGES, BUYING_ROLES, dealValue, DELIVERY_MODES, DOC_KINDS, DOC_STATUSES, EMPLOYEE_SIZES, inr,
  LOST_REASONS, PAYMENT_STATUSES, PAYMENT_TERMS, signBlocked,
} from "@/lib/b2b";

const label = "flex flex-col gap-1 text-xs font-bold";
const button = "bg-ink px-4 py-2 text-xs font-bold uppercase tracking-wider text-paper disabled:opacity-50";
const ghost = "border border-line/50 px-3 py-1.5 text-xs font-bold hover:bg-surface disabled:opacity-50";

interface Person { email: string; name: string | null }
type Msg = { ok: boolean; text: string } | null;
type Result = { ok: true; id?: string; message?: string } | { ok: false; message: string };

function Note({ msg }: { msg: Msg }) {
  if (!msg) return null;
  return <p role={msg.ok ? "status" : "alert"} className={`w-full text-xs font-semibold ${msg.ok ? "text-ink" : "text-error"}`}>{msg.text}</p>;
}

/** Runs an action with a busy flag and a message, and refreshes the page on success. */
function useAction() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);
  async function run(fn: () => Promise<Result>, done?: string | ((r: Result & { ok: true }) => void)) {
    setBusy(true);
    setMsg(null);
    const r = await fn().catch(() => ({ ok: false, message: "That could not be saved. Check your connection." }) as Result);
    setBusy(false);
    if (!r.ok) { setMsg({ ok: false, text: r.message }); return false; }
    if (typeof done === "function") done(r);
    else setMsg({ ok: true, text: r.message ?? done ?? "Saved." });
    router.refresh();
    return true;
  }
  return { busy, msg, setMsg, run };
}

function Select({ value, onChange, options, blank, ...rest }: { value: string; onChange: (v: string) => void; options: readonly { key: string; label: string }[]; blank?: string } & Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "onChange" | "value">) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={input} {...rest}>
      {blank !== undefined && <option value="">{blank}</option>}
      {options.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
    </select>
  );
}

// ── Deal fields, shared by new and edit ─────────────────────

export const blankDeal: DealInput = {
  title: "", owner_email: "", source: "outbound", courses: "", seats: "", price_per_seat: "", discount_inr: "", value_inr: "",
  payment_terms: "", payment_status: "not_due", po_number: "", delivery_mode: "", expected_close: "", cohort_start: "",
  renewal_date: "", next_step: "", next_step_date: "", status_note: "", notes: "",
};

const num = (s: string) => Number(s.replace(/[,\s₹]/g, "")) || 0;

function DealFields({ v, set, people, open }: { v: DealInput; set: (patch: Partial<DealInput>) => void; people: Person[]; open: boolean }) {
  const f = (k: keyof DealInput) => (e: { target: { value: string } }) => set({ [k]: e.target.value });
  const perSeat = v.price_per_seat.trim() !== "";
  const total = dealValue({ seats: num(v.seats), pricePerSeat: perSeat ? num(v.price_per_seat) : null, discount: num(v.discount_inr), typed: num(v.value_inr) });
  return (
    <>
      <fieldset className="grid gap-3 sm:col-span-2 sm:grid-cols-2 lg:col-span-4 lg:grid-cols-4">
        <legend className="mb-2 text-[11px] font-extrabold uppercase tracking-wider text-muted">The deal</legend>
        <label className={`${label} sm:col-span-2`}>Deal name<input required value={v.title} onChange={f("title")} placeholder="System Design for 40 engineers" className={input} /></label>
        <label className={label}>Owner<Select value={v.owner_email} onChange={(owner_email) => set({ owner_email })} options={people.map((p) => ({ key: p.email, label: p.name ?? p.email }))} blank="Unassigned" /></label>
        <label className={label}>Source<Select value={v.source} onChange={(source) => set({ source })} options={B2B_SOURCES} /></label>
        <label className={`${label} sm:col-span-2`}>Courses<input value={v.courses} onChange={f("courses")} placeholder="System Design, AI for PMs" className={input} /></label>
        <label className={label}>Delivery<Select value={v.delivery_mode} onChange={(delivery_mode) => set({ delivery_mode })} options={DELIVERY_MODES} blank="Not decided" /></label>
        <label className={label}>Cohort starts<input type="date" value={v.cohort_start} onChange={f("cohort_start")} className={input} /></label>
      </fieldset>

      <fieldset className="grid gap-3 sm:col-span-2 sm:grid-cols-2 lg:col-span-4 lg:grid-cols-4">
        <legend className="mb-2 text-[11px] font-extrabold uppercase tracking-wider text-muted">Money</legend>
        <label className={label}>Seats<input inputMode="numeric" value={v.seats} onChange={f("seats")} placeholder="40" className={input} /></label>
        <label className={label}>Price per seat (₹)<input inputMode="numeric" value={v.price_per_seat} onChange={f("price_per_seat")} placeholder="Leave empty for a lump sum" className={input} /></label>
        {perSeat
          ? <label className={label}>Discount (₹)<input inputMode="numeric" value={v.discount_inr} onChange={f("discount_inr")} placeholder="0" className={input} /></label>
          : <label className={label}>Deal value (₹)<input inputMode="numeric" value={v.value_inr} onChange={f("value_inr")} placeholder="2,00,000" className={input} /></label>}
        <div className={label}>
          Total
          <p className="display nums py-1 text-2xl">{inr(total)}</p>
        </div>
        <label className={label}>Payment terms<Select value={v.payment_terms} onChange={(payment_terms) => set({ payment_terms })} options={PAYMENT_TERMS} blank="Not agreed" /></label>
        <label className={label}>Payment<Select value={v.payment_status} onChange={(payment_status) => set({ payment_status })} options={PAYMENT_STATUSES} /></label>
        <label className={label}>Their PO number<input value={v.po_number} onChange={f("po_number")} className={input} /></label>
        <label className={label}>Expected to sign<input type="date" value={v.expected_close} onChange={f("expected_close")} className={input} /></label>
        <label className={label}>Renewal date<input type="date" value={v.renewal_date} onChange={f("renewal_date")} className={input} /></label>
      </fieldset>

      <fieldset className="grid gap-3 sm:col-span-2 sm:grid-cols-2 lg:col-span-4 lg:grid-cols-4">
        <legend className="mb-2 text-[11px] font-extrabold uppercase tracking-wider text-muted">Next step</legend>
        <label className={`${label} sm:col-span-2`}>Next step{open && " *"}<input required={open} value={v.next_step} onChange={f("next_step")} placeholder="Send the proposal" className={input} /></label>
        <label className={label}>By when{open && " *"}<input required={open} type="date" value={v.next_step_date} onChange={f("next_step_date")} className={input} /></label>
        <label className={label}>Status line<input value={v.status_note} onChange={f("status_note")} maxLength={120} placeholder="Waiting on their legal" className={input} /></label>
        <label className={`${label} sm:col-span-2 lg:col-span-4`}>Notes<textarea value={v.notes} onChange={f("notes")} rows={3} className={input} /></label>
      </fieldset>
    </>
  );
}

// ── New deal ────────────────────────────────────────────────

const blankCompany: CompanyInput = { name: "", industry: "", employees: "", city: "", website: "", linkedin: "", gstin: "", billing_address: "", notes: "" };
const blankContact: ContactInput = { name: "", designation: "", buying_role: "decision_maker", email: "", phone: "", linkedin: "", is_primary: true };

export function NewDealForm({ companies, people, me, companyId }: { companies: { id: string; name: string }[]; people: Person[]; me: string; companyId?: string }) {
  const router = useRouter();
  const [pick, setPick] = useState(companyId ?? (companies.length ? "" : "new"));
  const [company, setCompany] = useState(blankCompany);
  const [contact, setContact] = useState(blankContact);
  const [deal, setDeal] = useState<DealInput>({ ...blankDeal, owner_email: people.some((p) => p.email === me) ? me : "" });
  const { busy, msg, run } = useAction();
  const isNew = pick === "new";
  const c = (k: keyof CompanyInput) => (e: { target: { value: string } }) => setCompany({ ...company, [k]: e.target.value });
  const p = (k: keyof ContactInput) => (e: { target: { value: string } }) => setContact({ ...contact, [k]: e.target.value });

  return (
    <form
      className="card grid gap-5 p-5 sm:grid-cols-2 lg:grid-cols-4"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!pick) return;
        await run(() => createDeal({ companyId: isNew ? null : pick, company: isNew ? company : undefined, contact: isNew ? contact : undefined, deal }),
          (r) => router.push(`/admin/sales/b2b/deals/${r.id}`));
      }}
    >
      <fieldset className="grid gap-3 sm:col-span-2 sm:grid-cols-2 lg:col-span-4 lg:grid-cols-4">
        <legend className="mb-2 text-[11px] font-extrabold uppercase tracking-wider text-muted">Company</legend>
        <label className={`${label} sm:col-span-2`}>
          Company
          <select required value={pick} onChange={(e) => setPick(e.target.value)} className={input}>
            <option value="" disabled>Pick a company</option>
            <option value="new">+ A new company</option>
            {companies.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
          </select>
        </label>
        {isNew && (
          <>
            <label className={`${label} sm:col-span-2`}>Company name<input required value={company.name} onChange={c("name")} placeholder="Acme Technologies Pvt Ltd" className={input} /></label>
            <label className={label}>Industry<input value={company.industry} onChange={c("industry")} placeholder="IT services" className={input} /></label>
            <label className={label}>Employees<select value={company.employees} onChange={c("employees")} className={input}><option value="">Not known</option>{EMPLOYEE_SIZES.map((s) => <option key={s}>{s}</option>)}</select></label>
            <label className={label}>City<input value={company.city} onChange={c("city")} placeholder="Noida" className={input} /></label>
            <label className={label}>Website<input value={company.website} onChange={c("website")} placeholder="acme.com" className={input} /></label>
          </>
        )}
      </fieldset>

      {isNew && (
        <fieldset className="grid gap-3 sm:col-span-2 sm:grid-cols-2 lg:col-span-4 lg:grid-cols-4">
          <legend className="mb-2 text-[11px] font-extrabold uppercase tracking-wider text-muted">Main contact</legend>
          <label className={label}>Name<input value={contact.name} onChange={p("name")} className={input} /></label>
          <label className={label}>Designation<input value={contact.designation} onChange={p("designation")} placeholder="CEO" className={input} /></label>
          <label className={label}>Role in the decision<Select value={contact.buying_role} onChange={(buying_role) => setContact({ ...contact, buying_role })} options={BUYING_ROLES} /></label>
          <label className={label}>Email<input type="email" value={contact.email} onChange={p("email")} className={input} /></label>
          <label className={label}>Phone<input inputMode="tel" value={contact.phone} onChange={p("phone")} className={input} /></label>
          <label className={label}>LinkedIn<input value={contact.linkedin} onChange={p("linkedin")} className={input} /></label>
        </fieldset>
      )}

      <DealFields v={deal} set={(patch) => setDeal({ ...deal, ...patch })} people={people} open />

      <div className="flex items-end gap-3 sm:col-span-2 lg:col-span-4">
        <button type="submit" disabled={busy || !pick} className={button}>{busy ? "Adding…" : "Add deal"}</button>
        <p className="text-xs text-muted">It starts at Lead, with Proposal, NDA, MSA and SOW to do. An NDA or MSA already signed with this company carries over.</p>
        <Note msg={msg} />
      </div>
    </form>
  );
}

// ── One deal ────────────────────────────────────────────────

export function DealDetailsForm({ id, value, people, open }: { id: string; value: DealInput; people: Person[]; open: boolean }) {
  const [v, setV] = useState(value);
  const { busy, msg, run } = useAction();
  return (
    <form className="card grid gap-5 p-5 sm:grid-cols-2 lg:grid-cols-4" onSubmit={async (e) => { e.preventDefault(); await run(() => updateDeal(id, v)); }}>
      <DealFields v={v} set={(patch) => setV({ ...v, ...patch })} people={people} open={open} />
      <div className="flex items-end gap-3 sm:col-span-2 lg:col-span-4">
        <button type="submit" disabled={busy} className={button}>{busy ? "Saving…" : "Save deal"}</button>
        <Note msg={msg} />
      </div>
    </form>
  );
}

/** The stage, with the signing rule shown before anyone tries, and a reason when lost. */
export function StageControl({ id, stage, docs }: { id: string; stage: string; docs: { kind: string; status: string }[] }) {
  const [next, setNext] = useState(stage);
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const { busy, msg, run } = useAction();
  const blocked = next === "signed" && stage !== "signed" ? signBlocked(docs) : null;
  return (
    <form
      className="flex flex-wrap items-end gap-2"
      onSubmit={async (e) => { e.preventDefault(); await run(() => setDealStage(id, next, { reason, note }), "Stage saved."); }}
    >
      <label className={label}>Move to<Select value={next} onChange={setNext} options={B2B_STAGES} /></label>
      {next === "lost" && (
        <>
          <label className={label}>Why<Select required value={reason} onChange={setReason} options={LOST_REASONS} blank="Pick a reason" /></label>
          <label className={label}>Detail<input value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} className={input} /></label>
        </>
      )}
      <button type="submit" disabled={busy || next === stage || !!blocked} className={button}>{busy ? "Moving…" : "Move"}</button>
      {blocked && <p className="w-full text-xs font-semibold text-red-deep">{blocked}</p>}
      <Note msg={msg} />
    </form>
  );
}

export function StatusNote({ id, value }: { id: string; value: string | null }) {
  const [v, setV] = useState(value ?? "");
  const { busy, msg, run } = useAction();
  return (
    <form className="flex min-w-[16rem] flex-1 items-center gap-2" onSubmit={async (e) => { e.preventDefault(); await run(() => setStatusNote(id, v)); }}>
      <input aria-label="Status line" value={v} onChange={(e) => setV(e.target.value)} maxLength={120} placeholder="One line on where it stands" className={`${input} flex-1 py-1.5`} />
      {v !== (value ?? "") && <button type="submit" disabled={busy} className={ghost}>Save</button>}
      {msg && !msg.ok && <Note msg={msg} />}
    </form>
  );
}

interface Doc { kind: string; status: string; version: string | null; sent_on: string | null; signed_on: string | null; client_signer: string | null; link: string | null; updated_at: string; updated_by: string | null }

function DocRow({ dealId, kind, doc }: { dealId: string; kind: { key: string; label: string }; doc: Doc | undefined }) {
  const [editing, setEditing] = useState(false);
  const [v, setV] = useState<DocInput>({
    status: doc?.status ?? "not_needed", version: doc?.version ?? "", sent_on: doc?.sent_on ?? "",
    signed_on: doc?.signed_on ?? "", client_signer: doc?.client_signer ?? "", link: doc?.link ?? "",
  });
  const { busy, msg, run } = useAction();
  const status = doc?.status ?? "not_needed";
  const tone = status === "signed" ? "text-emerald-800" : status === "not_needed" ? "text-muted" : "text-red-deep";
  const f = (k: keyof DocInput) => (e: { target: { value: string } }) => setV({ ...v, [k]: e.target.value });
  return (
    <li className="py-2.5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        <b className="w-32">{kind.label}</b>
        <select
          aria-label={`${kind.label} status`}
          value={v.status}
          disabled={busy}
          onChange={async (e) => {
            const next = { ...v, status: e.target.value };
            setV(next);
            await run(() => saveDoc(dealId, kind.key, next));
          }}
          className={`border border-line/30 bg-transparent px-1.5 py-1 text-xs font-bold ${tone}`}
        >
          {DOC_STATUSES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
        <span className="text-xs text-muted nums">
          {[doc?.version && `v${doc.version.replace(/^v/i, "")}`, doc?.sent_on && `sent ${doc.sent_on}`, doc?.signed_on && `signed ${doc.signed_on}`, doc?.client_signer && `by ${doc.client_signer}`].filter(Boolean).join(" · ")}
        </span>
        {doc?.link && <a href={doc.link} target="_blank" rel="noopener noreferrer" className="text-xs font-bold underline">Open file</a>}
        <button type="button" onClick={() => setEditing(!editing)} className="ml-auto text-xs font-bold text-muted underline">{editing ? "Close" : "Details"}</button>
      </div>
      {editing && (
        <form className="mt-2 grid gap-2 sm:grid-cols-3" onSubmit={async (e) => { e.preventDefault(); if (await run(() => saveDoc(dealId, kind.key, v))) setEditing(false); }}>
          <label className={label}>Version<input value={v.version} onChange={f("version")} placeholder="2" className={input} /></label>
          <label className={label}>Sent on<input type="date" value={v.sent_on} onChange={f("sent_on")} className={input} /></label>
          <label className={label}>Signed on<input type="date" value={v.signed_on} onChange={f("signed_on")} className={input} /></label>
          <label className={label}>Signed for them by<input value={v.client_signer} onChange={f("client_signer")} placeholder="Name, designation" className={input} /></label>
          <label className={`${label} sm:col-span-2`}>Link (Drive or PDF)<input value={v.link} onChange={f("link")} placeholder="https://drive.google.com/…" className={input} /></label>
          <div className="sm:col-span-3"><button type="submit" disabled={busy} className={button}>Save {kind.label}</button></div>
        </form>
      )}
      <Note msg={msg && !msg.ok ? msg : null} />
    </li>
  );
}

export function DocChecklist({ dealId, docs }: { dealId: string; docs: Doc[] }) {
  return (
    <ul className="divide-y divide-line/15">
      {DOC_KINDS.map((k) => <DocRow key={`${k.key}-${docs.find((d) => d.kind === k.key)?.updated_at ?? ""}`} dealId={dealId} kind={k} doc={docs.find((d) => d.kind === k.key)} />)}
    </ul>
  );
}

export function ActivityForm({ dealId }: { dealId: string }) {
  const [kind, setKind] = useState("call");
  const [replied, setReplied] = useState(true);
  const [attendees, setAttendees] = useState("");
  const [note, setNote] = useState("");
  const [nextStep, setNextStep] = useState("");
  const [nextDate, setNextDate] = useState("");
  const { busy, msg, run } = useAction();
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={async (e) => {
        e.preventDefault();
        const ok = await run(() => logActivity(dealId, { kind, replied, attendees, note, next_step: nextStep, next_step_date: nextDate }), "Logged.");
        if (ok) { setNote(""); setAttendees(""); setNextStep(""); setNextDate(""); }
      }}
    >
      <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="What it was">
        {ACTIVITY_KINDS.map((k) => (
          <button key={k.key} type="button" role="radio" aria-checked={kind === k.key} onClick={() => setKind(k.key)}
            className={`border px-2.5 py-1 text-xs font-bold ${kind === k.key ? "border-ink bg-ink text-paper" : "border-line/40 hover:bg-surface"}`}>
            {k.label}
          </button>
        ))}
      </div>
      {kind === "meeting" && <label className={label}>Who was there<input value={attendees} onChange={(e) => setAttendees(e.target.value)} placeholder="Their CEO, L&D head, and who from us" className={input} /></label>}
      {kind !== "note" && kind !== "meeting" && (
        <label className="flex items-center gap-2 text-xs font-bold"><input type="checkbox" checked={replied} onChange={(e) => setReplied(e.target.checked)} /> They responded</label>
      )}
      <label className={label}>{kind === "meeting" ? "What was decided" : "Note"}<textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} required={kind === "note"} className={input} /></label>
      <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
        <label className={label}>New next step (optional)<input value={nextStep} onChange={(e) => setNextStep(e.target.value)} placeholder="Share the SOW draft" className={input} /></label>
        <label className={label}>By when<input type="date" value={nextDate} onChange={(e) => setNextDate(e.target.value)} className={input} /></label>
      </div>
      <div className="flex items-center gap-3"><button type="submit" disabled={busy} className={button}>{busy ? "Logging…" : "Log it"}</button><Note msg={msg} /></div>
    </form>
  );
}

interface TaskRow { id: string; title: string; due: string | null; assignee_email: string | null; done_at: string | null }

export function Tasks({ dealId, tasks, people, me, today }: { dealId: string; tasks: TaskRow[]; people: Person[]; me: string; today: string }) {
  const [title, setTitle] = useState("");
  const [due, setDue] = useState("");
  const [who, setWho] = useState(people.some((p) => p.email === me) ? me : "");
  const { busy, msg, run } = useAction();
  const name = (e: string | null) => (e === me ? "You" : people.find((p) => p.email === e)?.name ?? e?.split("@")[0] ?? "");
  return (
    <div className="flex flex-col gap-3">
      {tasks.length > 0 && (
        <ul className="divide-y divide-line/15">
          {tasks.map((t) => (
            <li key={t.id} className="flex items-start gap-2 py-2 text-sm">
              <input type="checkbox" aria-label={`Done: ${t.title}`} checked={!!t.done_at} disabled={busy} onChange={(e) => run(() => setTaskDone(t.id, e.target.checked), "")} className="mt-1" />
              <div className="flex-1">
                <p className={t.done_at ? "text-muted line-through" : ""}>{t.title}</p>
                <p className="text-xs text-muted nums">
                  {t.due && <b className={!t.done_at && t.due < today ? "text-red-deep" : ""}>{t.due === today ? "Today" : t.due}</b>}
                  {t.due && t.assignee_email ? " · " : ""}{name(t.assignee_email)}
                </p>
              </div>
              <button type="button" onClick={() => run(() => deleteTask(t.id), "")} className="text-xs text-muted underline">Remove</button>
            </li>
          ))}
        </ul>
      )}
      <form className="grid gap-2 sm:grid-cols-[1fr_auto_auto_auto]" onSubmit={async (e) => { e.preventDefault(); if (await run(() => addTask(dealId, { title, due, assignee_email: who }), "")) { setTitle(""); setDue(""); } }}>
        <input aria-label="Task" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Get the PO from finance" className={input} />
        <input aria-label="Due" type="date" value={due} onChange={(e) => setDue(e.target.value)} className={input} />
        <select aria-label="For" value={who} onChange={(e) => setWho(e.target.value)} className={input}>
          {people.map((p) => <option key={p.email} value={p.email}>{p.name ?? p.email}</option>)}
        </select>
        <button type="submit" disabled={busy} className={button}>Add</button>
      </form>
      {msg && !msg.ok && <Note msg={msg} />}
    </div>
  );
}

// ── Company and people ──────────────────────────────────────

interface ContactRow extends ContactInput { id: string }

function ContactEditor({ companyId, contact, onDone }: { companyId: string; contact?: ContactRow; onDone: () => void }) {
  const [v, setV] = useState<ContactInput>(contact ?? { ...blankContact, is_primary: false });
  const { busy, msg, run } = useAction();
  const f = (k: keyof ContactInput) => (e: { target: { value: string } }) => setV({ ...v, [k]: e.target.value });
  return (
    <form className="grid gap-2 py-3 sm:grid-cols-3" onSubmit={async (e) => { e.preventDefault(); if (await run(() => saveContact(companyId, contact?.id ?? null, v))) onDone(); }}>
      <label className={label}>Name<input required value={v.name} onChange={f("name")} className={input} /></label>
      <label className={label}>Designation<input value={v.designation} onChange={f("designation")} className={input} /></label>
      <label className={label}>Role in the decision<Select value={v.buying_role} onChange={(buying_role) => setV({ ...v, buying_role })} options={BUYING_ROLES} /></label>
      <label className={label}>Email<input type="email" value={v.email} onChange={f("email")} className={input} /></label>
      <label className={label}>Phone<input inputMode="tel" value={v.phone} onChange={f("phone")} className={input} /></label>
      <label className={label}>LinkedIn<input value={v.linkedin} onChange={f("linkedin")} className={input} /></label>
      <label className="flex items-center gap-2 text-xs font-bold"><input type="checkbox" checked={v.is_primary} onChange={(e) => setV({ ...v, is_primary: e.target.checked })} /> Main contact</label>
      <div className="flex items-center gap-2 sm:col-span-2">
        <button type="submit" disabled={busy} className={button}>{contact ? "Save person" : "Add person"}</button>
        <button type="button" onClick={onDone} className={ghost}>Cancel</button>
        <Note msg={msg && !msg.ok ? msg : null} />
      </div>
    </form>
  );
}

const roleLabel = (k: string) => BUYING_ROLES.find((r) => r.key === k)?.label ?? k;

export function Contacts({ companyId, contacts }: { companyId: string; contacts: (Omit<ContactRow, "designation" | "email" | "phone" | "linkedin"> & { designation: string | null; email: string | null; phone: string | null; linkedin: string | null })[] }) {
  const [editing, setEditing] = useState<string | null>(null);
  const { run } = useAction();
  const asInput = (c: (typeof contacts)[number]): ContactRow => ({ ...c, designation: c.designation ?? "", email: c.email ?? "", phone: c.phone ? `+${c.phone}` : "", linkedin: c.linkedin ?? "" });
  return (
    <div>
      {contacts.length === 0 && editing !== "new" && <p className="text-sm text-muted">Nobody added yet.</p>}
      <ul className="divide-y divide-line/15">
        {contacts.map((c) => editing === c.id ? (
          <li key={c.id}><ContactEditor companyId={companyId} contact={asInput(c)} onDone={() => setEditing(null)} /></li>
        ) : (
          <li key={c.id} className="flex flex-wrap items-start gap-2 py-2.5 text-sm">
            <div className="min-w-0 flex-1">
              <p><b>{c.name}</b>{c.designation && <span className="text-muted">, {c.designation}</span>}{c.is_primary && <span className="ml-2 bg-ink px-1.5 py-0.5 text-[10px] font-extrabold uppercase text-paper">Main</span>}</p>
              <p className="text-xs text-muted">{roleLabel(c.buying_role)}</p>
              <p className="mt-0.5 flex flex-wrap gap-x-3 text-xs">
                {c.email && <a href={`mailto:${c.email}`} className="underline">{c.email}</a>}
                {c.phone && <a href={`tel:+${c.phone}`} className="underline nums">+{c.phone}</a>}
                {c.phone && <a href={`https://wa.me/${c.phone}`} target="_blank" rel="noopener noreferrer" className="underline">WhatsApp</a>}
                {c.linkedin && <a href={c.linkedin} target="_blank" rel="noopener noreferrer" className="underline">LinkedIn</a>}
              </p>
            </div>
            <button type="button" onClick={() => setEditing(c.id)} className="text-xs font-bold underline">Edit</button>
            <button type="button" onClick={() => { if (confirm(`Remove ${c.name}?`)) run(() => deleteContact(c.id), ""); }} className="text-xs text-muted underline">Remove</button>
          </li>
        ))}
      </ul>
      {editing === "new"
        ? <ContactEditor companyId={companyId} onDone={() => setEditing(null)} />
        : <button type="button" onClick={() => setEditing("new")} className={`${ghost} mt-2`}>+ Add a person</button>}
    </div>
  );
}

export function CompanyForm({ id, value }: { id: string | null; value?: CompanyInput }) {
  const router = useRouter();
  const [v, setV] = useState(value ?? blankCompany);
  const { busy, msg, run } = useAction();
  const f = (k: keyof CompanyInput) => (e: { target: { value: string } }) => setV({ ...v, [k]: e.target.value });
  return (
    <form
      className="card grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4"
      onSubmit={async (e) => {
        e.preventDefault();
        await run(() => saveCompany(id, v), id ? "Saved." : (r) => router.push(`/admin/sales/b2b/companies/${r.id}`));
      }}
    >
      <label className={`${label} sm:col-span-2`}>Company name<input required value={v.name} onChange={f("name")} className={input} /></label>
      <label className={label}>Industry<input value={v.industry} onChange={f("industry")} className={input} /></label>
      <label className={label}>Employees<select value={v.employees} onChange={f("employees")} className={input}><option value="">Not known</option>{EMPLOYEE_SIZES.map((s) => <option key={s}>{s}</option>)}</select></label>
      <label className={label}>City<input value={v.city} onChange={f("city")} className={input} /></label>
      <label className={label}>Website<input value={v.website} onChange={f("website")} className={input} /></label>
      <label className={label}>LinkedIn<input value={v.linkedin} onChange={f("linkedin")} className={input} /></label>
      <label className={label}>Their GSTIN<input value={v.gstin} onChange={f("gstin")} placeholder="09AAACM1234A1Z5" className={input} /></label>
      <label className={`${label} sm:col-span-2`}>Billing address<textarea value={v.billing_address} onChange={f("billing_address")} rows={2} className={input} /></label>
      <label className={`${label} sm:col-span-2`}>Notes<textarea value={v.notes} onChange={f("notes")} rows={2} className={input} /></label>
      <div className="flex items-end gap-3 sm:col-span-2 lg:col-span-4">
        <button type="submit" disabled={busy} className={button}>{busy ? "Saving…" : id ? "Save company" : "Add company"}</button>
        <Note msg={msg} />
      </div>
    </form>
  );
}

// ── After signing ───────────────────────────────────────────

const slugify = (s: string) => s.toLowerCase().replace(/\b(pvt|private|ltd|limited|llp|inc|technologies|technology|consultancy|systems)\b/g, " ")
  .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);

export function Workspace({ dealId, b2bCompanyId, companyName, contactEmail, seats }: { dealId: string; b2bCompanyId: string; companyName: string; contactEmail: string | null; seats: number }) {
  const [slug, setSlug] = useState(slugify(companyName));
  const [hr, setHr] = useState(!!contactEmail);
  const [mode, setMode] = useState<"create" | "link">("create");
  const { busy, msg, run } = useAction();
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={async (e) => {
        e.preventDefault();
        await run(() => (mode === "create" ? createWorkspace(dealId, slug, hr) : linkWorkspace(b2bCompanyId, slug)));
      }}
    >
      <div className="flex gap-1.5">
        <button type="button" onClick={() => setMode("create")} className={`border px-2.5 py-1 text-xs font-bold ${mode === "create" ? "border-ink bg-ink text-paper" : "border-line/40"}`}>Create new</button>
        <button type="button" onClick={() => setMode("link")} className={`border px-2.5 py-1 text-xs font-bold ${mode === "link" ? "border-ink bg-ink text-paper" : "border-line/40"}`}>Link existing</button>
      </div>
      <label className={label}>
        {mode === "create" ? "URL name" : "URL name of the existing workspace"}
        <span className="flex items-center gap-1 text-sm font-normal"><span className="text-muted">klymb.ai/org/</span><input required value={slug} onChange={(e) => setSlug(e.target.value)} className={`${input} flex-1`} /></span>
      </label>
      {mode === "create" && (
        <>
          <p className="text-xs text-muted">Starts with {seats} seat{seats === 1 ? "" : "s"}, from the deal.</p>
          <label className="flex items-center gap-2 text-xs font-bold">
            <input type="checkbox" checked={hr} disabled={!contactEmail} onChange={(e) => setHr(e.target.checked)} />
            {contactEmail ? `Add the main contact (${contactEmail}) as HR and email them how to sign in` : "Add an email to the main contact to make them HR"}
          </label>
        </>
      )}
      <div className="flex items-center gap-3"><button type="submit" disabled={busy} className={button}>{busy ? "Working…" : mode === "create" ? "Create workspace" : "Link workspace"}</button><Note msg={msg} /></div>
    </form>
  );
}

export function DeleteDeal({ id, title }: { id: string; title: string }) {
  const router = useRouter();
  const { busy, msg, run } = useAction();
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        disabled={busy}
        onClick={() => { if (confirm(`Delete "${title}" with its documents, activity and tasks? This can't be undone. To close it, move it to Lost instead.`)) run(() => deleteDeal(id), (r) => router.push(r.id ? `/admin/sales/b2b/companies/${r.id}` : "/admin/sales/b2b/deals")); }}
        className="text-xs font-bold text-red-deep underline"
      >
        Delete deal
      </button>
      <Note msg={msg} />
    </div>
  );
}
