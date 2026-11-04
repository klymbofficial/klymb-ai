"use client";

import { useState, useTransition } from "react";
import { removeFromTeam } from "@/app/(learn)/learn/hackathon/actions";

interface Member { id: string; name: string; isLeader: boolean; isMe: boolean }

/** The team, with remove (for the leader) and leave (for a member) while the roster is open. */
export function TeamRoster({ members, canEdit, iLead }: { members: Member[]; canEdit: boolean; iLead: boolean }) {
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const [confirming, setConfirming] = useState<string | null>(null);
  return (
    <div>
      <ul className="divide-y divide-line/25 border-y border-line/25">
        {members.map((m) => {
          const can = canEdit && (m.isMe ? !(iLead && members.length > 1) : iLead);
          return (
            <li key={m.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <span className="text-[15px] font-semibold">{m.name}{m.isMe && <span className="font-normal text-muted"> (you)</span>}{m.isLeader && <span className="ml-2 rounded-full bg-surface px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-muted">Leader</span>}</span>
              {can && (confirming === m.id ? (
                <span className="flex items-center gap-3 text-sm">
                  <span>{m.isMe ? "Leave the team?" : `Remove ${m.name.split(" ")[0]}?`}</span>
                  <button type="button" disabled={pending} className="font-bold text-red-deep underline underline-offset-2" onClick={() => start(async () => {
                    const r = await removeFromTeam(m.id);
                    setConfirming(null);
                    setError(r.ok ? "" : r.message ?? "That didn't work.");
                  })}>{pending ? "Working…" : "Yes"}</button>
                  <button type="button" className="text-muted underline underline-offset-2" onClick={() => setConfirming(null)}>No</button>
                </span>
              ) : (
                <button type="button" onClick={() => setConfirming(m.id)} className="text-sm font-semibold text-muted underline underline-offset-2 hover:text-red-deep">{m.isMe ? "Leave" : "Remove"}</button>
              ))}
            </li>
          );
        })}
      </ul>
      {error && <p role="alert" className="mt-3 text-sm font-semibold text-error">{error}</p>}
    </div>
  );
}
