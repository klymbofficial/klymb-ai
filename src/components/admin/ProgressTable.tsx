"use client";

import clsx from "clsx";
import Link from "next/link";
import { useState } from "react";
import { removeLearner, setLearnerStatus, type LearnerStatus } from "@/app/admin/learner-actions";
import { tracks } from "@/data/tracks";
import type { LearnerProgress } from "@/lib/admin/data";

const trackName = (slug: string) => tracks.find((t) => t.slug === slug)?.name ?? slug;

const bandLabel: Record<string, string> = {
  distinction: "Distinction",
  job_ready: "Job-ready",
  developing: "Developing",
  not_yet: "Not yet",
};

const STATUSES: LearnerStatus[] = ["active", "paused", "withdrawn", "completed"];

/** 30 ticks: filled = submitted. Assessment days are marked in red. */
function DayStrip({ done }: { done: number }) {
  return (
    <span className="flex gap-px" aria-hidden="true">
      {Array.from({ length: 30 }, (_, i) => {
        const day = i + 1;
        const isGate = day % 7 === 0 && day <= 28;
        return <span key={day} className={clsx("h-4 w-1.5", day <= done ? (isGate ? "bg-red-strong" : "bg-ink") : "bg-line")} />;
      })}
    </span>
  );
}

/** Evidence at a glance: provided, or conspicuously missing. */
function EvidenceCell({ learner }: { learner: LearnerProgress }) {
  return (
    <span className="flex flex-col gap-1 text-xs">
      {learner.github_username ? (
        <a href={learner.github_url ?? `https://github.com/${learner.github_username}`} target="_blank" rel="noopener noreferrer"
           className="underline underline-offset-2 hover:text-red-deep">
          GitHub: {learner.github_username}
        </a>
      ) : (
        <span className="font-bold text-red-deep">GitHub missing</span>
      )}
      {learner.linkedin_slug ? (
        <a href={learner.linkedin_url ?? `https://www.linkedin.com/in/${learner.linkedin_slug}`} target="_blank" rel="noopener noreferrer"
           className="underline underline-offset-2 hover:text-red-deep">
          LinkedIn: {learner.linkedin_slug}
        </a>
      ) : (
        <span className="font-bold text-red-deep">LinkedIn missing</span>
      )}
      <span className={clsx("nums", learner.linkedin_posts === 0 && "text-muted")}>
        Posts {learner.linkedin_posts}/4
      </span>
    </span>
  );
}

function RowActions({ learner }: { learner: LearnerProgress }) {
  const [status, setStatus] = useState<string>(learner.status);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [typed, setTyped] = useState("");
  const [error, setError] = useState("");
  const [removed, setRemoved] = useState(false);

  if (removed) return <span className="text-xs font-bold text-muted">Removed</span>;

  return (
    <span className="flex flex-col items-start gap-2">
      <label className="sr-only" htmlFor={`status-${learner.id}`}>Status for {learner.name}</label>
      <select
        id={`status-${learner.id}`}
        value={status}
        disabled={busy}
        onChange={async (e) => {
          const next = e.target.value as LearnerStatus;
          setStatus(next);
          setBusy(true);
          setError("");
          const result = await setLearnerStatus(learner.id, next);
          setBusy(false);
          if (!result.ok) {
            setStatus(learner.status);
            setError(result.message);
          }
        }}
        className="border-2 border-line bg-paper px-2 py-1 text-[11px] font-bold uppercase tracking-wider focus:border-ink focus:outline-none"
      >
        {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
      </select>

      {confirming ? (
        <span className="flex flex-col gap-1">
          <label htmlFor={`confirm-${learner.id}`} className="text-[11px] font-bold text-red-deep">
            Type {learner.email} to delete permanently
          </label>
          <input
            id={`confirm-${learner.id}`} value={typed} onChange={(e) => setTyped(e.target.value)}
            autoComplete="off" spellCheck={false}
            className="w-48 border-2 border-red-deep bg-white px-2 py-1 text-xs focus:outline-none"
          />
          <span className="flex gap-2">
            <button
              type="button" disabled={busy}
              onClick={async () => {
                setBusy(true);
                setError("");
                const result = await removeLearner(learner.id, typed);
                setBusy(false);
                if (result.ok) setRemoved(true);
                else setError(result.message);
              }}
              className="border-2 border-red-deep bg-red-deep px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-white disabled:opacity-50"
            >
              {busy ? "Deleting…" : "Delete"}
            </button>
            <button
              type="button" onClick={() => { setConfirming(false); setTyped(""); setError(""); }}
              className="border-2 border-line px-2 py-1 text-[11px] font-bold uppercase tracking-wider"
            >
              Cancel
            </button>
          </span>
        </span>
      ) : (
        <button
          type="button" onClick={() => setConfirming(true)}
          className="text-[11px] font-bold uppercase tracking-wider text-muted underline underline-offset-2 hover:text-red-deep"
        >
          Remove…
        </button>
      )}

      {error && <span role="alert" className="max-w-[12rem] text-[11px] font-semibold text-error">{error}</span>}
    </span>
  );
}

export function ProgressTable({ rows }: { rows: LearnerProgress[] }) {
  return (
    <div className="overflow-x-auto border-2 border-line bg-paper">
      <table className="w-full min-w-[1080px] text-left text-sm">
        <thead className="sticky top-0 z-10 bg-ink text-paper">
          <tr>
            {["Learner", "Track", "Progress", "Days", "Assessments", "Evidence", "Status & removal"].map((h) => (
              <th key={h} scope="col" className="p-3 text-[11px] font-extrabold uppercase tracking-[0.1em]">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((l, i) => (
            <tr key={l.id} className={clsx("border-t border-line align-top", i % 2 && "bg-surface/60")}>
              <th scope="row" className="max-w-[14rem] p-3 font-bold break-words">
                <Link href={`/admin/learners/${l.id}`} className="underline underline-offset-2 hover:text-red-deep">{l.name}</Link>
                <span className="block text-xs font-normal text-muted">{l.email}</span>
              </th>
              <td className="p-3 text-xs">{trackName(l.track)}</td>
              <td className="p-3"><DayStrip done={l.days_submitted} /></td>
              <td className="p-3 nums font-extrabold">
                {l.days_submitted}<span className="text-muted">/30</span>
                {l.last_submission_at && (
                  <span className="block text-[11px] font-normal text-muted">
                    last {new Date(l.last_submission_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                  </span>
                )}
              </td>
              <td className="p-3 nums">
                {l.assessments_scored}<span className="text-muted">/4</span>
                {l.latest_band && <span className="mt-0.5 block text-[11px] font-bold text-red-deep">{bandLabel[l.latest_band] ?? l.latest_band}</span>}
              </td>
              <td className="p-3"><EvidenceCell learner={l} /></td>
              <td className="p-3"><RowActions learner={l} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
