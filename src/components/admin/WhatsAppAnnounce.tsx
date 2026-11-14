"use client";

import { useState } from "react";
import { sendWhatsAppAnnouncement, type AnnounceResult } from "@/app/admin/sd-whatsapp-actions";

/** The one-off WhatsApp group announcement: who it reaches, then one confirmed press. */
export function WhatsAppAnnounce({ learners, devices, sentAt }: { learners: number; devices: number; sentAt: string | null }) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<AnnounceResult | null>(null);
  if (sentAt && !result) return <p className="text-sm">Sent {new Date(sentAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}. It can only go out once.</p>;
  if (result?.ok) return <p role="status" className="text-sm font-semibold">Sent: {result.emailed} emails ({result.emailFailed} failed), {result.pushed} phone notifications ({result.pushFailed} failed).</p>;
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        disabled={busy || !learners}
        onClick={async () => {
          if (!window.confirm(`Send the WhatsApp group email to ${learners} paid learners and a notification to ${devices} devices? This can't be undone.`)) return;
          setBusy(true);
          setResult(await sendWhatsAppAnnouncement());
          setBusy(false);
        }}
        className="rounded-md bg-ink px-4 py-2 text-xs font-bold uppercase tracking-wider text-paper disabled:opacity-50"
      >
        {busy ? "Sending…" : `Send to ${learners} learners`}
      </button>
      {result && !result.ok && <span role="alert" className="text-xs font-semibold text-error">{result.message}</span>}
    </div>
  );
}
