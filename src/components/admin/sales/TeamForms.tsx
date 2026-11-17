"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { addRep, assignLeads, removeRep } from "@/app/admin/sales-actions";
import { input } from "@/components/admin/sales/styles";

const button = "bg-ink px-4 py-2 text-xs font-bold uppercase tracking-wider text-paper disabled:opacity-50";

/** Add an intern by the Google email they'll sign in with. */
export function AddRep() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  return (
    <form
      className="card flex flex-wrap items-end gap-3 p-5"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setMsg(null);
        const r = await addRep({ email, name });
        setBusy(false);
        if (!r.ok) return setMsg({ ok: false, text: r.message });
        setMsg({ ok: true, text: `Added. Send them klymb.ai/sales/login and ask them to sign in with ${email.trim()}.` });
        setEmail("");
        setName("");
        router.refresh();
      }}
    >
      <label className="flex flex-col gap-1 text-xs font-bold">
        Name
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Rohan Sharma" className={`${input} w-48`} />
      </label>
      <label className="flex flex-col gap-1 text-xs font-bold">
        Google email
        <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="rohan@gmail.com" className={`${input} w-64`} />
      </label>
      <button type="submit" disabled={busy} className={button}>{busy ? "Adding…" : "Add intern"}</button>
      {msg && <p role={msg.ok ? "status" : "alert"} className={`w-full text-xs font-semibold ${msg.ok ? "text-ink" : "text-error"}`}>{msg.text}</p>}
    </form>
  );
}

/** Removing takes effect at once; their open leads come back to you. */
export function RemoveRep({ email, name, open }: { email: string; name: string; open: number }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");
  if (!confirming) {
    return <button type="button" onClick={() => setConfirming(true)} className="text-xs font-bold text-error underline underline-offset-4">Remove</button>;
  }
  return (
    <span className="flex flex-wrap items-center gap-2 text-xs">
      <span>Remove {name}? They lose access now{open ? ` and their ${open} open lead${open === 1 ? "" : "s"} come back to you` : ""}.</span>
      <button
        type="button"
        onClick={async () => {
          const r = await removeRep(email);
          if (r.ok) router.refresh();
          else setError(r.message);
        }}
        className="bg-error px-3 py-1.5 font-bold text-white"
      >
        Remove
      </button>
      <button type="button" onClick={() => setConfirming(false)} className="font-bold underline">Cancel</button>
      {error && <span role="alert" className="text-error">{error}</span>}
    </span>
  );
}

/** Ticks or clears every lead checkbox in the same form. */
export function SelectAll() {
  return (
    <input
      type="checkbox"
      aria-label="Tick every lead on this page"
      onChange={(e) => {
        for (const box of e.currentTarget.form?.querySelectorAll<HTMLInputElement>('input[name="id"]') ?? []) box.checked = e.currentTarget.checked;
      }}
      className="size-4 accent-ink"
    />
  );
}

/**
 * The Leads table as a form: tick leads and a bar appears at the bottom of
 * the screen to hand them to someone. Hidden until something is ticked.
 */
export function AssignForm({ owners, children }: { owners: { email: string; name: string | null; rep?: boolean }[]; children: React.ReactNode }) {
  const ref = useRef<HTMLFormElement>(null);
  const [count, setCount] = useState(0);
  const [busy, setBusy] = useState(false);
  const recount = () => {
    // Only boxes on screen: the table and the phone cards both carry them.
    const boxes = ref.current?.querySelectorAll<HTMLInputElement>('input[name="id"]:checked') ?? [];
    setCount([...boxes].filter((b) => b.offsetParent !== null).length);
  };
  return (
    <form
      ref={ref}
      onChange={recount}
      action={async (fd) => {
        // Hidden duplicates (the other layout) are dropped so each lead is sent once.
        const ids = [...(ref.current?.querySelectorAll<HTMLInputElement>('input[name="id"]:checked') ?? [])].filter((b) => b.offsetParent !== null).map((b) => b.value);
        const clean = new FormData();
        for (const id of ids) clean.append("id", id);
        clean.set("to", String(fd.get("to") ?? ""));
        setBusy(true);
        await assignLeads(clean);
        setBusy(false);
        ref.current?.reset();
        setCount(0);
      }}
    >
      {children}
      {count > 0 && (
        <div className="sticky bottom-3 z-10 mt-3 flex flex-wrap items-center gap-2 rounded-xl bg-ink p-3 text-xs text-paper shadow-lg">
          <span className="font-bold">{count} ticked · assign to</span>
          <select name="to" required defaultValue="" className="min-w-40 flex-1 bg-white px-2 py-2 text-sm text-ink sm:flex-none" aria-label="Assign ticked leads to">
            <option value="" disabled>Pick someone</option>
            {owners.map((o) => <option key={o.email} value={o.email}>{o.name ?? o.email}{o.rep ? " (intern)" : ""}</option>)}
            <option value="none">Nobody (unassign)</option>
          </select>
          <button type="submit" disabled={busy} className="bg-red-strong px-4 py-2 font-bold uppercase tracking-wider text-white disabled:opacity-60">{busy ? "Assigning…" : "Assign"}</button>
          <button type="button" onClick={() => { ref.current?.reset(); setCount(0); }} className="ml-auto underline">Clear</button>
        </div>
      )}
    </form>
  );
}
