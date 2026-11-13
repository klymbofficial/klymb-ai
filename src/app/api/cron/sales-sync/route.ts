import { NextResponse } from "next/server";
import { isCronRequest } from "@/lib/cron-auth";
import { captureWebsiteLeads } from "@/lib/admin/sales-capture";
import { syncWhatsApp, whatsappSyncConfigured } from "@/lib/admin/whatsapp-sync";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Keeps the sales CRM fed: website form fills become leads, and WhatsApp
 * dashboard messages become touches (once WHATSAPP_D1_TOKEN is set).
 * Called by cron-job.org every 15 minutes with CRON_SECRET as a bearer token.
 */
export async function GET(req: Request) {
  if (!isCronRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const website = await captureWebsiteLeads({ cron: true });
  const whatsapp = whatsappSyncConfigured() ? await syncWhatsApp() : { ok: true, skipped: "WHATSAPP_D1_TOKEN not set" };
  return NextResponse.json({ website, whatsapp }, { status: whatsapp.ok ? 200 : 500 });
}
