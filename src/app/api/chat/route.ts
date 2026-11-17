import { NextResponse } from "next/server";
import { currentEmail } from "@/auth";
import { normaliseEmail } from "@/lib/email";
import { checkRateLimit } from "@/lib/rate-limit";
import { chatAnonOf, chatBody, chatPage, chatTokenOf } from "@/lib/live-chat";
import { addMessage, markSeen, messagesOf, notMigrated, notifyTeam, startThread, threadByToken } from "@/lib/live-chat-db";

export const dynamic = "force-dynamic";

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const fail = (error: string, status: number) => NextResponse.json({ error }, { status });

/** The visitor's side of a chat: only what they and the team wrote, never who on the team. */
const visible = (m: { id: number; sender: "visitor" | "team"; body: string; created_at: string }) => ({ id: m.id, sender: m.sender, body: m.body, created_at: m.created_at });

/**
 * Live chat from the Kamran bot. `start` opens a chat with the first message
 * and hands back a secret token; `send` adds a message with that token. GET
 * returns the messages after `since`, and with `seen=1` marks them read.
 * A signed-in Google email wins over whatever was typed.
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (str(body?.website, 200)) return NextResponse.json({ ok: true }); // honeypot
  const text = chatBody(body?.message);
  if (!text) return fail("Type a message first.", 400);
  const page = chatPage(body?.page);

  if (body?.action === "start") {
    const email = normaliseEmail(await currentEmail()) ?? normaliseEmail(body?.email);
    if (!email) return fail("Add an email so we can reply if you leave.", 400);
    const limit = await checkRateLimit("chat-start", { limit: 3, windowMinutes: 60 });
    if (!limit.allowed) return fail("You've started a few chats already. We'll reply in the one you have.", 429);
    const raw = (typeof body.context === "object" && body.context ? body.context : {}) as Record<string, unknown>;
    const context: Record<string, string> = {};
    for (const k of ["track", "day", "lastQuestion", "device"]) {
      const v = raw[k];
      if (typeof v === "string" || typeof v === "number") context[k] = String(v).slice(0, 200);
    }
    const started = await startThread({ email, name: str(body.name, 80) || null, anon: chatAnonOf(body.anon), page, context, body: text });
    if ("error" in started) {
      console.error("chat start failed:", started.error?.code, started.error?.message);
      return fail(notMigrated(started.error) ? "Live chat isn't open yet." : "Couldn't start the chat. Try again.", notMigrated(started.error) ? 503 : 500);
    }
    await notifyTeam({ id: started.id, name: str(body.name, 80) || null, email }, text);
    return NextResponse.json({ token: started.token, messages: (await messagesOf(started.id)).map(visible) });
  }

  if (body?.action === "send") {
    const token = chatTokenOf(body.token);
    const thread = token ? await threadByToken(token) : null;
    if (!thread) return fail("This chat has ended. Start a new one.", 404);
    const limit = await checkRateLimit("chat-send", { limit: 30, windowMinutes: 60, identity: thread.id });
    if (!limit.allowed) return fail("That's a lot of messages. Give us a moment to catch up.", 429);
    const added = await addMessage(thread.id, "visitor", text, page);
    if (added.error || !added.data) return fail("Couldn't send. Try again.", 500);
    await notifyTeam(thread, text);
    return NextResponse.json({ message: visible(added.data) });
  }

  return fail("Unknown request.", 400);
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = chatTokenOf(req.headers.get("x-chat-token"));
  const thread = token ? await threadByToken(token) : null;
  if (!thread) return fail("No chat.", 404);
  const since = Math.max(0, Number(url.searchParams.get("since")) || 0);
  if (url.searchParams.get("seen") === "1") await markSeen(thread.id, "visitor");
  return NextResponse.json({ status: thread.status, messages: (await messagesOf(thread.id, since)).map(visible) }, { headers: { "Cache-Control": "no-store" } });
}
