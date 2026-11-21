"use client";

import { useState } from "react";
import { sendMeetLinkTest, sendMeetLinkToAll, type MeetSendResult } from "@/app/admin/webinar-actions";

/** Two buttons on /admin/webinars: a test to yourself, then the Meet link to everyone registered. */
export function WebinarMeetSend({ meetUrl, total }: { meetUrl: string; total: number }) {
  const [busy, setBusy] = useState<"test" | "all" | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const say = (r: MeetSendResult, test: boolean) =>
    setNote(!r.ok ? r.message : test ? "Test sent to your inbox. Check it before sending to everyone."
      : `Sent ${r.sent}.${r.already ? ` ${r.already} already had it.` : ""}${r.skipped ? ` ${r.skipped} skipped (bounced or unsubscribed).` : ""}${r.failed ? ` ${r.failed} failed: press the button again to retry just those.` : ""}`);

  async function go(kind: "test" | "all") {
    if (kind === "all" && !window.confirm(`Email the Google Meet link to all ${total} people registered? Anyone already sent it is skipped.`)) return;
    setBusy(kind); setNote(null);
    try { say(kind === "test" ? await sendMeetLinkTest() : await sendMeetLinkToAll(), kind === "test"); }
    catch { setNote("That didn't finish. Press it again: people already emailed are skipped."); }
    finally { setBusy(null); }
  }

  const btn = "rounded-lg border border-line/50 px-3 py-1.5 text-xs font-bold hover:bg-ink hover:text-paper disabled:opacity-50";
  return (
    <div className="card flex flex-col gap-3 p-4">
      <div>
        <h2 className="text-sm font-extrabold">Email the Google Meet link</h2>
        <p className="text-xs text-muted break-all">{meetUrl}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={btn} disabled={!!busy} onClick={() => go("test")}>{busy === "test" ? "Sending…" : "Send me a test"}</button>
        <button type="button" className={`${btn} bg-ink text-paper`} disabled={!!busy || !total} onClick={() => go("all")}>{busy === "all" ? "Sending… keep this tab open" : `Send to all ${total}`}</button>
      </div>
      {note && <p className="text-xs font-bold" role="status">{note}</p>}
    </div>
  );
}
