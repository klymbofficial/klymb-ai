import { NextResponse } from "next/server";
import { batchForMail, claimAutoReminders } from "@/lib/company/batch-data";
import { deliver } from "@/lib/company/batch-send";
import { isCronRequest } from "@/lib/cron-auth";
import { db } from "@/lib/db/client";

/**
 * The automatic reminder for hiring batches, once a day (vercel.json). Emails
 * each invited person whose last start falls within the next day and who has
 * had their invitation, once: the claim stamps auto_reminded_at first, so a
 * second run sends nothing. Vercel's free plan runs crons daily, so the
 * reminder lands somewhere between a few hours and a day before. Requires
 * CRON_SECRET as a bearer token.
 */
export async function GET(req: Request) {
  if (!isCronRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const sql = db();
  if (!sql) return NextResponse.json({ error: "Not configured" }, { status: 500 });

  const due = await claimAutoReminders(sql);
  if (!due) return NextResponse.json({ error: "Read failed" }, { status: 500 });
  let sent = 0, failed = 0;
  for (const batchId of new Set(due.map((d) => d.batchId))) {
    const batch = await batchForMail(sql, batchId);
    const targets = due.filter((d) => d.batchId === batchId);
    if (!batch) { failed += targets.length; continue; }
    const r = await deliver(sql, batch, "auto_reminder", targets, null);
    sent += r.sent;
    failed += r.failed;
  }
  return NextResponse.json({ sent, failed });
}
