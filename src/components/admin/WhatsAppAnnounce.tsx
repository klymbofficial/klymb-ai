"use client";

import { useState } from "react";
import { sendWhatsAppAnnouncement, type AnnounceResult } from "@/app/admin/sd-whatsapp-actions";

const when = (at: string) => new Date(at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

/** The WhatsApp group announcement: who is still waiting for it, then one confirmed press. */
export function WhatsAppAnnounce({ learners, devices, lastSentAt }: { learners: number; devices: number; lastSentAt: string | null }) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<AnnounceResult | null>(null);
  if (result?.ok) return <p role="status" className="text-sm font-semibold">Sent: {result.emailed} emails ({result.emailFailed} failed), {result.pushed} phone notifications ({result.pushFailed} failed).</p>;
  if (!learners) return <p className="text-sm">Everyone enrolled has had it{lastSentAt ? ` (last sent ${when(lastSentAt)})` : ""}. New buyers get it by email right after paying.</p>;
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        disabled={busy || !learners}
        onClick={async () => {
          if (!window.confirm(`Send the WhatsApp group email to ${learners} enrolled learners who haven't had it, and a notification to ${devices} devices? This can't be undone.`)) return;
          setBusy(true);
          setResult(await sendWhatsAppAnnouncement());
          setBusy(false);
        }}
        className="rounded-md bg-ink px-4 py-2 text-xs font-bold uppercase tracking-wider text-paper disabled:opacity-50"
      >
        {busy ? "Sending…" : `Send to ${learners} learners`}
      </button>
      {lastSentAt && <span className="text-xs text-muted">Last sent {when(lastSentAt)}</span>}
      {result && !result.ok && <span role="alert" className="text-xs font-semibold text-error">{result.message}</span>}
    </div>
  );
}
