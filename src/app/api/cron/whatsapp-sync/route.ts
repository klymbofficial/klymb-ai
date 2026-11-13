import { NextResponse } from "next/server";
import { isCronRequest } from "@/lib/cron-auth";
import { syncWhatsApp } from "@/lib/admin/whatsapp-sync";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Copies new WhatsApp dashboard messages into sales touches. Called by
 * cron-job.org every 15 minutes with CRON_SECRET as a bearer token; the
 * "Sync WhatsApp" button on /admin/sales runs the same thing on demand.
 */
export async function GET(req: Request) {
  if (!isCronRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const result = await syncWhatsApp();
  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}
