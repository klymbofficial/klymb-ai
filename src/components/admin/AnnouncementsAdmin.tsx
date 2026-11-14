"use client";

import { useState } from "react";
import { postAnnouncement, removeAnnouncement, type AnnouncementInput } from "@/app/admin/announcement-actions";

export interface AnnouncementRow {
  id: string; title: string; body: string; link_url: string | null; link_label: string | null; audience: "all" | "paid";
  created_by: string; created_at: string; removed_at: string | null; pushed: number; emailed: number;
}

const input = "border border-line/60 bg-white px-3 py-2 text-sm focus:border-ink focus:outline-none";
const when = (iso: string) => new Date(iso).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
const AUDIENCE = { all: "All enrolled learners", paid: "Paid learners only" } as const;
const BLANK: AnnouncementInput = { title: "", body: "", linkUrl: "", linkLabel: "", audience: "all", push: false, email: false };

export function AnnouncementsAdmin({ rows }: { rows: AnnouncementRow[] }) {
  return (
    <div className="flex flex-col gap-8">
      <Compose />
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-line/30 text-xs uppercase tracking-wider text-muted">
            <tr><th className="px-4 py-3">Announcement</th><th className="px-4 py-3">For</th><th className="px-4 py-3">Sent</th><th className="px-4 py-3">Posted</th><th className="px-4 py-3" /></tr>
          </thead>
          <tbody className="divide-y divide-line/20">
            {rows.map((r) => (
              <tr key={r.id} className={r.removed_at ? "text-muted" : ""}>
                <td className="max-w-[420px] px-4 py-3">
                  <div className="font-semibold">{r.title}</div>
                  <div className="whitespace-pre-line text-xs text-muted">{r.body}</div>
                  {r.link_url && <div className="mt-1 text-xs">Button: {r.link_label} → <span className="break-all">{r.link_url}</span></div>}
                </td>
                <td className="px-4 py-3">{AUDIENCE[r.audience]}</td>
                <td className="whitespace-nowrap px-4 py-3 text-xs">{r.emailed} emails · {r.pushed} pushes</td>
                <td className="whitespace-nowrap px-4 py-3 text-xs">{when(r.created_at)}<br /><span className="text-muted">{r.created_by}</span></td>
                <td className="px-4 py-3">{r.removed_at ? <span className="text-xs">Removed</span> : <Remove id={r.id} />}</td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={5} className="px-4 py-6 text-center text-muted">Nothing posted yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Compose() {
  const [f, setF] = useState<AnnouncementInput>(BLANK);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const set = <K extends keyof AnnouncementInput>(k: K, v: AnnouncementInput[K]) => setF((p) => ({ ...p, [k]: v }));

  return (
    <form
      className="card flex flex-col gap-4 p-5"
      onSubmit={async (e) => {
        e.preventDefault();
        const also = [f.push && "a phone notification", f.email && "an email"].filter(Boolean).join(" and ");
        if (!window.confirm(`Post “${f.title.trim()}” to ${AUDIENCE[f.audience].toLowerCase()}${also ? `, and send ${also} to each of them` : ""}? Anything sent can't be taken back.`)) return;
        setBusy(true);
        setMsg(null);
        const r = await postAnnouncement(f);
        setBusy(false);
        if (!r.ok) return setMsg({ ok: false, text: r.message });
        setMsg({ ok: true, text: `Posted.${f.push || f.email ? ` ${r.emailed} emails and ${r.pushed} phone notifications sent to ${r.reached} learners${r.failed ? `, ${r.failed} failed` : ""}.` : ""}` });
        setF(BLANK);
      }}
    >
      <label className="flex flex-col gap-1 text-xs font-bold">
        Title
        <input required maxLength={120} value={f.title} onChange={(e) => set("title", e.target.value)} className={input} />
      </label>
      <label className="flex flex-col gap-1 text-xs font-bold">
        Message
        <textarea required maxLength={1000} rows={4} value={f.body} onChange={(e) => set("body", e.target.value)} className={input} />
        <span className="font-normal text-muted">{f.body.length}/1000</span>
      </label>
      <div className="flex flex-wrap gap-3">
        <label className="flex flex-[2_1_280px] flex-col gap-1 text-xs font-bold">
          Link (optional)
          <input type="url" placeholder="https://" value={f.linkUrl} onChange={(e) => set("linkUrl", e.target.value)} className={input} />
        </label>
        <label className="flex flex-[1_1_180px] flex-col gap-1 text-xs font-bold">
          Button text
          <input maxLength={40} placeholder="Open link" value={f.linkLabel} onChange={(e) => set("linkLabel", e.target.value)} disabled={!f.linkUrl} className={input} />
        </label>
      </div>
      <fieldset className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
        <legend className="mb-1 text-xs font-bold">Who sees it</legend>
        {(["all", "paid"] as const).map((a) => (
          <label key={a} className="flex items-center gap-2"><input type="radio" name="audience" checked={f.audience === a} onChange={() => set("audience", a)} />{AUDIENCE[a]}</label>
        ))}
      </fieldset>
      <fieldset className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
        <legend className="mb-1 text-xs font-bold">Also send</legend>
        <label className="flex items-center gap-2"><input type="checkbox" checked={f.push} onChange={(e) => set("push", e.target.checked)} />Phone notification</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={f.email} onChange={(e) => set("email", e.target.checked)} />Email</label>
      </fieldset>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={busy} className="bg-ink px-4 py-2 text-xs font-bold uppercase tracking-wider text-paper disabled:opacity-50">{busy ? "Posting…" : "Post announcement"}</button>
        {msg && <p role={msg.ok ? "status" : "alert"} className={`text-xs font-semibold ${msg.ok ? "text-ink" : "text-error"}`}>{msg.text}</p>}
      </div>
    </form>
  );
}

function Remove({ id }: { id: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <span className="flex flex-col items-start gap-1">
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          if (!window.confirm("Remove this from every learner's inbox? Emails and notifications already sent stay sent.")) return;
          setBusy(true);
          const r = await removeAnnouncement(id);
          setBusy(false);
          if (!r.ok) setError(r.message ?? "That didn't work.");
        }}
        className="rounded-md border border-line/50 px-3 py-1.5 text-xs font-bold uppercase tracking-wider hover:bg-surface disabled:opacity-50"
      >
        {busy ? "Removing…" : "Remove"}
      </button>
      {error && <span role="alert" className="text-xs text-error">{error}</span>}
    </span>
  );
}
