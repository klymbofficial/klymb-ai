"use client";

import { useState, useTransition } from "react";
import { saveJobRole } from "@/app/admin/roles-actions";

const input = "w-full border-2 border-line/50 bg-white px-2 py-1.5 text-sm focus:border-ink";

/** One job role's fields, saved on their own; a new role when `revision` is 0. */
export function RoleEditor({ role, revision, tagCounts }: {
  role: { slug: string; label: string; summary: string; skills: string[]; status: "active" | "hidden"; sort: number };
  revision: number;
  /** How many published multiple-choice questions carry each tag, to show coverage. */
  tagCounts: Record<string, number>;
}) {
  const [f, setF] = useState({ ...role, skills: role.skills.join(", ") });
  const [rev, setRev] = useState(revision);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, go] = useTransition();
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF((x) => ({ ...x, [k]: e.target.value }));
  const skills = f.skills.split(",").map((s) => s.trim()).filter(Boolean);
  return (
    <form
      className="grid gap-3 border-2 border-line/40 bg-white p-4 md:grid-cols-[12rem_minmax(0,1fr)]"
      onSubmit={(e) => { e.preventDefault(); go(async () => { const out = await saveJobRole(rev, f); setMsg({ ok: out.ok, text: out.message }); if (out.ok) setRev(out.revision); }); }}
    >
      <label className="flex flex-col gap-1 text-xs font-bold">Key<input value={f.slug} onChange={set("slug")} disabled={rev > 0} className={input} /></label>
      <label className="flex flex-col gap-1 text-xs font-bold">Name<input value={f.label} onChange={set("label")} className={input} /></label>
      <label className="flex flex-col gap-1 text-xs font-bold md:col-span-2">About it<input value={f.summary} onChange={set("summary")} className={input} /></label>
      <label className="flex flex-col gap-1 text-xs font-bold md:col-span-2">
        Skills (Library tags, comma-separated)
        <input value={f.skills} onChange={set("skills")} className={input} />
        <span className="font-normal text-muted">
          {skills.map((s) => `${s}: ${tagCounts[s.toLowerCase()] ?? 0}`).join(" · ")} · {skills.reduce((n, s) => n + (tagCounts[s.toLowerCase()] ?? 0), 0)} tagged in all (a question may count twice)
        </span>
      </label>
      <label className="flex flex-col gap-1 text-xs font-bold">Order<input type="number" value={f.sort} onChange={set("sort")} className={input} /></label>
      <label className="flex flex-col gap-1 text-xs font-bold">
        Companies see it
        <select value={f.status} onChange={set("status")} className={input}><option value="active">Yes</option><option value="hidden">No (hidden)</option></select>
      </label>
      <div className="flex items-center gap-3 md:col-span-2">
        <button type="submit" disabled={pending} className="border-2 border-ink px-4 py-2 text-xs font-bold uppercase tracking-wider hover:bg-ink hover:text-paper disabled:opacity-50">{pending ? "Saving…" : rev ? "Save" : "Add role"}</button>
        {msg && <p role={msg.ok ? "status" : "alert"} className={msg.ok ? "text-sm" : "text-sm font-semibold text-error"}>{msg.text}</p>}
      </div>
    </form>
  );
}
