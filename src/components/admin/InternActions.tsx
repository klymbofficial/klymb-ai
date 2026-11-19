"use client";

import clsx from "clsx";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { makeInternLink, recordPayout, saveInternNote, setInternStatus } from "@/app/admin/internship-actions";
import type { InternStatus } from "@/lib/internship";

const NEXT: { key: InternStatus; label: string; tone: string }[] = [
  { key: "shortlisted", label: "Shortlist", tone: "border-sky-700/40 text-sky-900 hover:bg-sky-50" },
  { key: "accepted", label: "Accept", tone: "border-emerald-700/40 text-emerald-900 hover:bg-emerald-50" },
  { key: "rejected", label: "Reject", tone: "border-red-strong/40 text-red-deep hover:bg-red-tint" },
];

/** Shortlist, accept or reject one application, with a note from the call. Accepting also makes them a sales rep. */
export function InternActions({ id, status, note }: { id: string; status: InternStatus; note: string | null }) {
  const router = useRouter();
  const [text, setText] = useState(note ?? "");
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();

  const move = (to: InternStatus) => start(async () => {
    if (to === "accepted" && !window.confirm("Accept them? They'll also be added as a sales rep and can sign in at klymb.ai/sales with this email.")) return;
    const r = await setInternStatus(id, to, text);
    setMsg(!r.ok ? r.message : to === "accepted" ? (r.rep ? "Accepted, and added as a sales rep." : "Accepted, but adding them as a rep failed: add them in Sales › Team.") : "Saved.");
    router.refresh();
  });

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap gap-1.5">
        {NEXT.filter((n) => n.key !== status).map((n) => (
          <button key={n.key} type="button" disabled={pending} onClick={() => move(n.key)} className={clsx("border px-2 py-1 text-[11px] font-bold disabled:opacity-50", n.tone)}>{n.label}</button>
        ))}
      </div>
      <textarea
        aria-label="Note from the call"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => { if (text.trim() !== (note ?? "").trim()) start(async () => { const r = await saveInternNote(id, text); setMsg(r.ok ? "Note saved." : r.message); }); }}
        rows={2}
        maxLength={1000}
        placeholder="Note from the call…"
        className="w-full resize-y border border-line/40 bg-white px-2 py-1 text-xs focus:border-ink focus:outline-none"
      />
      {msg && <span role="status" className="text-[11px] text-muted">{msg}</span>}
    </div>
  );
}

/** "Mark paid": what was paid to one intern for one month. */
export function PayoutForm({ email, month, suggested }: { email: string; month: string; suggested: number }) {
  const router = useRouter();
  const [rupees, setRupees] = useState(suggested > 0 ? String(suggested / 100) : "");
  const [method, setMethod] = useState("upi");
  const [reference, setReference] = useState("");
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();
  return (
    <form
      onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await recordPayout({ email, month, rupees, method, reference }); setMsg(r.ok ? "Saved." : r.message); if (r.ok) { setReference(""); router.refresh(); } }); }}
      className="flex flex-wrap items-center gap-1.5"
    >
      <input aria-label="Amount paid in rupees" inputMode="decimal" value={rupees} onChange={(e) => setRupees(e.target.value)} placeholder="₹" className="w-20 border border-line/50 bg-white px-2 py-1 text-xs" />
      <select aria-label="How it was paid" value={method} onChange={(e) => setMethod(e.target.value)} className="border border-line/50 bg-white px-1.5 py-1 text-xs">
        <option value="upi">UPI</option><option value="bank">Bank</option><option value="other">Other</option>
      </select>
      <input aria-label="Reference" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="UTR / ref" maxLength={120} className="w-24 border border-line/50 bg-white px-2 py-1 text-xs" />
      <button type="submit" disabled={pending || !rupees} className="bg-ink px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-paper disabled:opacity-40">Mark paid</button>
      {msg && <span role="status" className="w-full text-[11px] text-muted">{msg}</span>}
    </form>
  );
}

/** For a rep who has no personal link yet. */
export function MakeLink({ email, name }: { email: string; name: string }) {
  const router = useRouter();
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();
  return (
    <span className="inline-flex items-center gap-2">
      <button type="button" disabled={pending} onClick={() => start(async () => { const r = await makeInternLink(email, name); setMsg(r.ok ? `Link made: ${r.code}` : r.message); router.refresh(); })} className="border border-line/50 px-2 py-1 text-[11px] font-bold hover:bg-surface disabled:opacity-50">Make link</button>
      {msg && <span role="status" className="text-[11px] text-muted">{msg}</span>}
    </span>
  );
}
