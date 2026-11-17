import { createHash, randomBytes } from "node:crypto";
import { normaliseEmail } from "@/lib/email";

/**
 * Live chat, "Talk to our team" in the Kamran bot. These are the rules, kept
 * free of the database so they can be tested; the queries are in
 * live-chat-db.ts. Visitors only ever see "Klymb team", never a person's name.
 */

/** What visitors see as the sender of a reply. */
export const TEAM_NAME = "Klymb team";

const DEFAULT_CHAT_OWNER = "sarthakgupta.ksj@gmail.com";

/** The one admin who can open /admin/chat and gets its notifications: LIVE_CHAT_EMAIL, else Sarthak. */
export function chatOwnerEmail(raw: string | undefined = process.env.LIVE_CHAT_EMAIL) {
  return normaliseEmail(raw) ?? DEFAULT_CHAT_OWNER;
}

export const isChatOwner = (email: unknown, owner = chatOwnerEmail()) => normaliseEmail(email) === owner;

/** A visitor's secret for their chat: kept in their browser, stored only as a hash. */
export const newChatToken = () => randomBytes(24).toString("base64url");
export const hashChatToken = (token: string) => createHash("sha256").update(`klymb-chat:${token}`).digest("hex");
export const chatTokenOf = (v: unknown) => (typeof v === "string" && /^[A-Za-z0-9_-]{32}$/.test(v) ? v : null);

export const MAX_BODY = 2000;

/** A message as typed, cleaned: trimmed, at most 2,000 characters. Empty is no message. */
export function chatBody(v: unknown) {
  const s = typeof v === "string" ? v.replace(/\r\n/g, "\n").trim().slice(0, MAX_BODY) : "";
  return s || null;
}

/** A page path from the browser, kept short: "/system-design", never a full URL or a query. */
export function chatPage(v: unknown) {
  if (typeof v !== "string" || !v.startsWith("/")) return null;
  return v.split(/[?#]/)[0].slice(0, 200);
}

/** The browser id the course's activity log uses (klymb.sd.anon). */
export const chatAnonOf = (v: unknown) => (typeof v === "string" && /^[a-zA-Z0-9-]{8,64}$/.test(v) ? v : null);

/** A visitor who hasn't looked at the chat for this long gets the team's reply by email. */
export const AWAY_MS = 3 * 60_000;
/** At most one reply email per chat in this window, so a burst of replies is one email. */
export const EMAIL_GAP_MS = 15 * 60_000;

/** Whether a reply sent now should also be emailed to the visitor. */
export function shouldEmailReply(t: { visitor_seen_at: string | null; emailed_at: string | null }, now = Date.now()) {
  const away = !t.visitor_seen_at || now - new Date(t.visitor_seen_at).getTime() >= AWAY_MS;
  const quiet = !t.emailed_at || now - new Date(t.emailed_at).getTime() >= EMAIL_GAP_MS;
  return away && quiet;
}

/** The visitor's last message has had no reply for a while: the bot says when to expect one. */
export function waitingTooLong(msgs: { sender: "visitor" | "team"; created_at: string }[], now = Date.now()) {
  const last = msgs.at(-1);
  return !!last && last.sender === "visitor" && now - new Date(last.created_at).getTime() >= AWAY_MS;
}
