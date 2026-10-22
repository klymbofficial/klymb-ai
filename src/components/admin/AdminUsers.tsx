"use client";

import { useState } from "react";
import { addAdminUser, removeAdminUser } from "@/app/admin/admin-users-actions";

interface Row { email: string; name: string | null; added_at: string; owner: boolean; you: boolean }

const input = "border border-line/60 bg-white px-3 py-2 text-sm focus:border-ink focus:outline-none";

export function AdminUsers({ rows }: { rows: Row[] }) {
  return (
    <div className="flex flex-col gap-8">
      <AddAdmin />
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="border-b border-line/30 text-xs uppercase tracking-wider text-muted">
            <tr><th className="px-4 py-3">Email</th><th className="px-4 py-3">Name</th><th className="px-4 py-3">Added</th><th className="px-4 py-3">Access</th></tr>
          </thead>
          <tbody className="divide-y divide-line/20">
            {rows.map((r) => (
              <tr key={r.email}>
                <td className="px-4 py-3 font-semibold">{r.email}{r.you && <span className="ml-2 text-xs font-normal text-muted">(you)</span>}</td>
                <td className="px-4 py-3">{r.name ?? "—"}</td>
                <td className="whitespace-nowrap px-4 py-3 nums">{new Date(r.added_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" })}</td>
                <td className="px-4 py-3">{r.owner ? <span className="text-xs font-bold uppercase tracking-wider">Owner</span> : <RemoveCell email={r.email} />}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AddAdmin() {
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
        const result = await addAdminUser(email, name);
        setBusy(false);
        if (result.ok) {
          setMsg({ ok: true, text: `${email.trim().toLowerCase()} can now sign in to admin.` });
          setEmail("");
          setName("");
        } else setMsg({ ok: false, text: result.message });
      }}
    >
      <label className="flex flex-col gap-1 text-xs font-bold">
        Google email
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="off" spellCheck={false} className={`${input} w-72`} />
      </label>
      <label className="flex flex-col gap-1 text-xs font-bold">
        Name (optional)
        <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" className={`${input} w-48`} />
      </label>
      <button type="submit" disabled={busy} className="bg-ink px-4 py-2 text-xs font-bold uppercase tracking-wider text-paper disabled:opacity-50">
        {busy ? "Adding…" : "Add admin"}
      </button>
      {msg && <p role={msg.ok ? "status" : "alert"} className={`w-full text-xs font-semibold ${msg.ok ? "text-ink" : "text-error"}`}>{msg.text}</p>}
    </form>
  );
}

function RemoveCell({ email }: { email: string }) {
  const [confirming, setConfirming] = useState(false);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (!confirming) {
    return (
      <button type="button" onClick={() => setConfirming(true)} className="text-xs font-bold uppercase tracking-wider text-muted underline underline-offset-2 hover:text-red-deep">
        Remove…
      </button>
    );
  }
  return (
    <span className="flex flex-col items-start gap-1">
      <label htmlFor={`remove-${email}`} className="text-xs font-bold text-red-deep">Type {email} to remove their access</label>
      <input id={`remove-${email}`} value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" spellCheck={false} className="w-56 border-2 border-red-deep bg-white px-2 py-1 text-xs focus:outline-none" />
      <span className="flex gap-2">
        <button
          type="button" disabled={busy}
          onClick={async () => {
            setBusy(true);
            setError("");
            const result = await removeAdminUser(email, typed);
            setBusy(false);
            if (!result.ok) setError(result.message);
          }}
          className="border-2 border-red-deep bg-red-deep px-2 py-1 text-xs font-bold uppercase tracking-wider text-white disabled:opacity-50"
        >
          {busy ? "Removing…" : "Remove"}
        </button>
        <button type="button" onClick={() => { setConfirming(false); setTyped(""); setError(""); }} className="rounded-md border border-line/50 px-2 py-1 text-xs font-bold">
          Cancel
        </button>
      </span>
      {error && <span role="alert" className="max-w-[16rem] text-xs font-semibold text-error">{error}</span>}
    </span>
  );
}
