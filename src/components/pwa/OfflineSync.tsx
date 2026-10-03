"use client";

import { useEffect, useState } from "react";
import { submitDay } from "@/app/(learn)/learn/actions";
import { dequeue, QUEUE_EVENT, readQueue } from "@/lib/offlineQueue";

/**
 * In the learner area: says when the learner is offline, sends any queued
 * submissions the moment the connection returns, and reports what is waiting.
 */
export function OfflineSync() {
  const [online, setOnline] = useState(true);
  const [pending, setPending] = useState(0);
  const [synced, setSynced] = useState(0);

  useEffect(() => {
    let flushing = false;
    const refresh = () => setPending(readQueue().length);
    const flush = async () => {
      if (flushing || !navigator.onLine) return;
      flushing = true;
      let sent = 0;
      for (const item of readQueue()) {
        const fd = new FormData();
        item.entries.forEach(([k, v]) => fd.append(k, v));
        try {
          const res = await submitDay(item.day, fd);
          // Sent, or refused on its merits (a bad link): either way it should not retry forever.
          dequeue(item);
          if (res.ok) sent++;
        } catch {
          break; // still unreachable; try again on the next reconnect
        }
      }
      flushing = false;
      if (sent) setSynced(sent);
      refresh();
    };
    const sync = () => {
      setOnline(navigator.onLine);
      refresh();
      void flush();
    };
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    window.addEventListener(QUEUE_EVENT, refresh);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
      window.removeEventListener(QUEUE_EVENT, refresh);
    };
  }, []);

  if (online && !pending && !synced) return null;
  return (
    <div role="status" className="fixed inset-x-3 bottom-4 z-50 mx-auto max-w-md rounded-card bg-night px-4 py-3 text-sm text-paper shadow-float">
      {!online ? (
        <p><strong>You&apos;re offline.</strong> Your course still opens, and anything you submit is saved here{pending ? ` (${pending} waiting)` : ""}. It sends when you reconnect.</p>
      ) : pending ? (
        <p>Sending {pending} saved submission{pending > 1 ? "s" : ""}…</p>
      ) : (
        <p className="flex items-center justify-between gap-3">
          <span><strong>Back online.</strong> {synced} saved submission{synced > 1 ? "s were" : " was"} sent.</span>
          <button type="button" onClick={() => setSynced(0)} className="font-bold underline underline-offset-2">OK</button>
        </p>
      )}
    </div>
  );
}
