import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/admin/auth";
import { isChatOwner } from "@/lib/live-chat";
import { waitForMessages } from "@/lib/live-chat-db";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * For /admin/chat: waits until a message newer than `after` exists (in one
 * chat with `thread`, or in any chat), then says so, and the page re-reads
 * itself. Only the live-chat owner may ask.
 */
export async function GET(req: Request) {
  const admin = await getAdmin();
  if (!admin || !isChatOwner(admin.email)) return new NextResponse("Not found", { status: 404 });
  const url = new URL(req.url);
  const after = Math.max(0, Number(url.searchParams.get("after")) || 0);
  const thread = url.searchParams.get("thread");
  const fresh = await waitForMessages(thread && /^[0-9a-f-]{36}$/.test(thread) ? thread : null, after, 20_000, req.signal);
  return NextResponse.json({ changed: fresh.length > 0 }, { headers: { "Cache-Control": "no-store" } });
}
