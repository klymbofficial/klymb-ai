"use client";

import { useState } from "react";
import { addFirstHr, createCompany, updateCompanySettings, type CompanyResult } from "@/app/admin/company-actions";
import { EmptyState } from "@/components/admin/EmptyState";
import { slugFromName } from "@/lib/admin/companies";
import type { CompanyRow } from "@/lib/admin/companies-data";

const input = "border border-line/60 bg-white px-3 py-2 text-sm focus:border-ink focus:outline-none";
const label = "flex flex-col gap-1 text-xs font-bold";
const submit = "bg-ink px-4 py-2 text-xs font-bold uppercase tracking-wider text-paper disabled:opacity-50";

type Message = { ok: boolean; text: string } | null;

function Note({ msg }: { msg: Message }) {
  if (!msg) return null;
  return <p role={msg.ok ? "status" : "alert"} className={`w-full text-xs font-semibold ${msg.ok ? "text-ink" : "text-error"}`}>{msg.text}</p>;
}

/** Runs a server action with a busy flag and a message underneath. */
function useAction() {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<Message>(null);
  async function run(action: () => Promise<CompanyResult>, done: string) {
    setBusy(true);
    setMsg(null);
    const result = await action();
    setBusy(false);
    setMsg(result.ok ? { ok: true, text: result.message ?? done } : { ok: false, text: result.message });
    return result.ok;
  }
  return { busy, msg, run };
}

export function CompaniesAdmin({ companies }: { companies: CompanyRow[] | null }) {
  return (
    <div className="flex flex-col gap-8">
      <CreateCompany />
      {companies === null ? (
        <EmptyState title="Companies unavailable" body="The database isn't reachable from here, or migration 0012 hasn't been run yet." />
      ) : companies.length === 0 ? (
        <EmptyState title="No companies yet" body="Create the first one above. It starts with no seats, so set the seats before adding its HR person." />
      ) : (
        companies.map((c) => <CompanyCard key={c.id} company={c} />)
      )}
    </div>
  );
}

function CreateCompany() {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const { busy, msg, run } = useAction();

  return (
    <form
      className="card flex flex-wrap items-end gap-3 p-5"
      onSubmit={async (e) => {
        e.preventDefault();
        const ok = await run(() => createCompany(name, slug), `${name.trim()} was created.`);
        if (ok) { setName(""); setSlug(""); setSlugEdited(false); }
      }}
    >
      <label className={label}>
        Company name
        <input
          required value={name} maxLength={120} autoComplete="off" className={`${input} w-64`}
          onChange={(e) => { setName(e.target.value); if (!slugEdited) setSlug(slugFromName(e.target.value)); }}
        />
      </label>
      <label className={label}>
        URL name (klymb.ai/org/…)
        <input
          required value={slug} maxLength={60} autoComplete="off" spellCheck={false} className={`${input} w-56 font-mono`}
          onChange={(e) => { setSlug(e.target.value.toLowerCase()); setSlugEdited(true); }}
        />
      </label>
      <button type="submit" disabled={busy} className={submit}>{busy ? "Creating…" : "Create company"}</button>
      <Note msg={msg} />
    </form>
  );
}

function CompanyCard({ company: c }: { company: CompanyRow }) {
  return (
    <section className="card flex flex-col gap-5 p-5" aria-labelledby={`company-${c.id}`}>
      <header className="flex flex-wrap items-center gap-4">
        {c.logo_url ? (
          // A pasted link from the company's own site, so next/image's host list can't cover it.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={c.logo_url} alt="" className="h-10 w-10 border border-line/30 bg-white object-contain" referrerPolicy="no-referrer" />
        ) : (
          <span aria-hidden="true" className="flex h-10 w-10 items-center justify-center border border-line/30 bg-paper text-sm font-black text-muted">
            {c.name.slice(0, 1).toUpperCase()}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <h2 id={`company-${c.id}`} className="text-lg font-black">{c.name}</h2>
          <p className="font-mono text-xs text-muted">/org/{c.slug}</p>
        </div>
        <p className="text-sm nums">
          <strong>{c.members}</strong> of <strong>{c.seat_count}</strong> seats used
        </p>
      </header>
      <SettingsForm company={c} />
      <HrForm company={c} />
    </section>
  );
}

function SettingsForm({ company: c }: { company: CompanyRow }) {
  const [logo, setLogo] = useState(c.logo_url ?? "");
  const [color, setColor] = useState(c.brand_color ?? "");
  const [seats, setSeats] = useState(String(c.seat_count));
  const { busy, msg, run } = useAction();
  const swatch = /^#?[0-9a-f]{6}$/i.test(color) ? (color.startsWith("#") ? color : `#${color}`) : "#83050b";

  return (
    <form
      className="flex flex-wrap items-end gap-3 border-t border-line/20 pt-4"
      onSubmit={async (e) => {
        e.preventDefault();
        await run(() => updateCompanySettings(c.id, { logoUrl: logo, brandColor: color, seatCount: seats }), "Saved.");
      }}
    >
      <label className={label}>
        Logo link (https)
        <input type="url" value={logo} onChange={(e) => setLogo(e.target.value)} placeholder="https://…/logo.png" autoComplete="off" spellCheck={false} className={`${input} w-72`} />
      </label>
      <label className={label}>
        Color
        <span className="flex items-center gap-2">
          <input
            type="color" value={swatch} onChange={(e) => setColor(e.target.value)}
            aria-label={`Pick ${c.name}'s color`} className="h-9 w-10 cursor-pointer border border-line/60 bg-white p-0.5"
          />
          <input value={color} onChange={(e) => setColor(e.target.value)} placeholder="Klymb's own" maxLength={7} autoComplete="off" spellCheck={false} className={`${input} w-28 font-mono`} />
        </span>
      </label>
      <label className={label}>
        Seats
        <input type="number" min={c.members} max={100000} step={1} required value={seats} onChange={(e) => setSeats(e.target.value)} className={`${input} w-24 nums`} />
      </label>
      <button type="submit" disabled={busy} className={submit}>{busy ? "Saving…" : "Save"}</button>
      <Note msg={msg} />
    </form>
  );
}

function HrForm({ company: c }: { company: CompanyRow }) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const { busy, msg, run } = useAction();

  if (c.hr_email) {
    return (
      <p className="border-t border-line/20 pt-4 text-sm">
        <span className="text-xs font-bold uppercase tracking-wider text-muted">HR person</span>{" "}
        <strong>{c.hr_name ?? c.hr_email}</strong>{c.hr_name && <span className="text-muted"> ({c.hr_email})</span>}
      </p>
    );
  }
  const noSeat = c.members >= c.seat_count;

  return (
    <form
      className="flex flex-wrap items-end gap-3 border-t border-line/20 pt-4"
      onSubmit={async (e) => {
        e.preventDefault();
        await run(() => addFirstHr(c.id, email, name), "Added.");
      }}
    >
      <label className={label}>
        First HR person&apos;s email
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="off" spellCheck={false} className={`${input} w-72`} />
      </label>
      <label className={label}>
        Name (optional)
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} autoComplete="off" className={`${input} w-48`} />
      </label>
      <button type="submit" disabled={busy || noSeat} className={submit}>{busy ? "Adding…" : "Add HR person"}</button>
      {noSeat && !msg && <p className="w-full text-xs text-muted">Set at least one free seat first.</p>}
      <Note msg={msg} />
    </form>
  );
}
