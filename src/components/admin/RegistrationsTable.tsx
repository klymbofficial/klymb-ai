"use client";

import { useMemo, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import clsx from "clsx";
import { tracks } from "@/data/tracks";
import { enrollRegistration } from "@/app/admin/enroll";
import type { Registration } from "@/lib/admin/data";

const trackName = (slug: string) => tracks.find((t) => t.slug === slug)?.name ?? slug;

const csvCell = (v: string) => `"${String(v ?? "").replace(/"/g, '""')}"`;

export function RegistrationsTable({ rows, enrolled }: { rows: Registration[]; enrolled: string[] }) {
  const [justEnrolled, setJustEnrolled] = useState<string[]>([]);
  const [enrolling, setEnrolling] = useState("");
  const [enrolError, setEnrolError] = useState("");
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [, startTransition] = useTransition();

  // Filters live in the URL, so a filtered view can be linked or reloaded.
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [track, setTrack] = useState(params.get("track") ?? "");

  function sync(next: { q?: string; track?: string }) {
    const sp = new URLSearchParams(params.toString());
    Object.entries(next).forEach(([k, v]) => (v ? sp.set(k, v) : sp.delete(k)));
    startTransition(() => router.replace(`${pathname}${sp.size ? `?${sp}` : ""}`, { scroll: false }));
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter(
      (r) =>
        (!track || r.track === track) &&
        (!q || `${r.name} ${r.email} ${r.phone} ${r.job_role}`.toLowerCase().includes(q)),
    );
  }, [rows, query, track]);

  function exportCsv() {
    const header = ["Registered", "Name", "Email", "Phone", "Track", "Current role", "Experience", "LinkedIn"];
    const body = filtered.map((r) =>
      [new Date(r.created_at).toISOString(), r.name, r.email, r.phone, trackName(r.track), r.job_role, r.experience, r.linkedin ?? ""]
        .map(csvCell)
        .join(","),
    );
    const blob = new Blob([[header.map(csvCell).join(","), ...body].join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `klymb-registrations-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[220px] flex-1">
          <label htmlFor="q" className="text-xs font-extrabold uppercase tracking-[0.14em] text-muted">Search</label>
          <input
            id="q" type="search" value={query} autoComplete="off" spellCheck={false}
            onChange={(e) => { setQuery(e.target.value); sync({ q: e.target.value }); }}
            placeholder="Name, email, phone or role…"
            className="mt-1.5 w-full rounded-lg border border-line/40 bg-card px-3 py-2 text-sm focus:border-ink/60 focus:ring-4 focus:ring-ink/5 focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="track" className="text-xs font-extrabold uppercase tracking-[0.14em] text-muted">Track</label>
          <select
            id="track" value={track} onChange={(e) => { setTrack(e.target.value); sync({ track: e.target.value }); }}
            className="mt-1.5 rounded-lg border border-line/40 bg-card px-3 py-2 text-sm focus:border-ink/60 focus:ring-4 focus:ring-ink/5 focus:outline-none"
          >
            <option value="">All tracks</option>
            {tracks.map((t) => <option key={t.slug} value={t.slug}>{t.name}</option>)}
          </select>
        </div>
        <button
          type="button" onClick={exportCsv}
          className="rounded-lg border border-line/50 px-4 py-2 text-xs font-bold hover:bg-ink hover:text-paper"
        >
          Export CSV
        </button>
        <p className="ml-auto text-sm text-muted nums" role="status" aria-live="polite">
          {filtered.length} of {rows.length}
        </p>
      </div>

      {enrolError && <p role="alert" className="border-2 border-error bg-error-tint p-3 text-sm font-semibold text-error">{enrolError}</p>}

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[940px] text-left text-sm">
          <thead className="sticky top-0 z-10 bg-ink text-paper">
            <tr>
              {["Registered", "Name", "Contact", "Track", "Background", "LinkedIn", "Cohort"].map((h) => (
                <th key={h} scope="col" className="p-3 text-xs font-extrabold uppercase tracking-[0.1em]">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="rows-lazy">
            {filtered.map((r, i) => (
              <tr key={r.id} className={clsx("border-t border-line align-top", i % 2 && "bg-surface/60")}>
                <td className="p-3 whitespace-nowrap nums text-muted">
                  {new Date(r.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                </td>
                <td className="max-w-[16rem] p-3 font-bold break-words">{r.name}</td>
                <td className="max-w-[18rem] p-3 break-words">
                  <a href={`mailto:${r.email}`} className="underline underline-offset-2 hover:text-red-deep">{r.email}</a>
                  <span className="block text-xs text-muted">{r.phone}</span>
                </td>
                <td className="p-3"><span className="border border-ink/40 px-2 py-0.5 text-xs font-bold">{trackName(r.track)}</span></td>
                <td className="p-3 text-xs">{r.job_role}<span className="block text-muted">{r.experience}</span></td>
                <td className="p-3 text-xs">
                  {r.linkedin ? (
                    <a href={r.linkedin} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-red-deep">Profile</a>
                  ) : <span className="text-muted">-</span>}
                </td>
                <td className="p-3 text-xs">
                  {enrolled.includes(r.email.toLowerCase()) || justEnrolled.includes(r.email.toLowerCase()) ? (
                    <span className="border border-ink px-2 py-0.5 text-xs font-bold uppercase tracking-wider">Enrolled</span>
                  ) : (
                    <button
                      type="button"
                      disabled={enrolling === r.id}
                      onClick={async () => {
                        setEnrolError("");
                        setEnrolling(r.id);
                        const result = await enrollRegistration({ name: r.name, email: r.email, track: r.track, cohort_start: r.cohort_start });
                        setEnrolling("");
                        if (result.ok) setJustEnrolled((prev) => [...prev, r.email.toLowerCase()]);
                        else setEnrolError(result.message);
                      }}
                      className="rounded-lg border border-line/50 px-2.5 py-1 text-xs font-bold hover:bg-ink hover:text-paper disabled:opacity-50"
                    >
                      {enrolling === r.id ? "Enrolling…" : "Enroll"}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <p className="p-5 text-sm text-muted">Nothing matches that search.</p>}
      </div>
    </div>
  );
}
