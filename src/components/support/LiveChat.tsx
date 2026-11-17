"use client";

import clsx from "clsx";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * "Talk to our team" inside the Kamran bot. The chat's secret token lives in
 * this browser, so the conversation follows the visitor across pages and
 * reloads. Replies are checked every 2 seconds while the chat is on screen
 * and every 15 seconds otherwise, only while the tab is visible.
 */

export interface ChatMsg { id: number; sender: "visitor" | "team"; body: string; created_at: string }

const TOKEN_KEY = "klymb:chat";
const SEEN_KEY = "klymb:chat-seen";
const EMAIL_KEY = "klymb:chat-email";
const ANON_KEY = "klymb.sd.anon"; // the course's activity id, so the team sees what this visitor did
const AWAY_MS = 3 * 60_000;

const read = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const write = (k: string, v: string | null) => { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch { /* private mode */ } };

function anonId() {
  let id = read(ANON_KEY);
  if (!id) { id = crypto.randomUUID(); write(ANON_KEY, id); }
  return id;
}

export function useLiveChat({ watching }: { watching: boolean }) {
  const [token, setToken] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [seen, setSeen] = useState(0);
  const [email, setEmail] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const last = useRef(0);
  const all = useRef<ChatMsg[]>([]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage is only readable after hydration
  useEffect(() => { setToken(read(TOKEN_KEY)); setSeen(Number(read(SEEN_KEY)) || 0); setEmail(read(EMAIL_KEY)); }, []);

  const pull = useCallback(async (markSeen: boolean) => {
    if (!token) return;
    const res = await fetch(`/api/chat?since=${last.current}${markSeen ? "&seen=1" : ""}`, { headers: { "x-chat-token": token }, cache: "no-store" }).catch(() => null);
    if (res?.status === 404) { write(TOKEN_KEY, null); setToken(null); all.current = []; setMsgs([]); last.current = 0; return; }
    const data = (await res?.json().catch(() => null)) as { messages?: ChatMsg[] } | null;
    const fresh = data?.messages ?? [];
    if (fresh.length) {
      last.current = fresh[fresh.length - 1].id;
      all.current = [...all.current, ...fresh.filter((f) => !all.current.some((x) => x.id === f.id))];
      setMsgs(all.current);
    }
    // On screen, every team reply counts as read.
    if (markSeen) {
      const top = all.current.filter((m) => m.sender === "team").at(-1)?.id ?? 0;
      setSeen((s) => { if (top > s) write(SEEN_KEY, String(top)); return Math.max(s, top); });
    }
    setNow(Date.now());
  }, [token]);

  useEffect(() => {
    if (!token) return;
    const tick = () => { if (document.visibilityState === "visible") void pull(watching); };
    tick();
    const t = window.setInterval(tick, watching ? 2_000 : 15_000);
    return () => window.clearInterval(t);
  }, [token, watching, pull]);


  const begin = (t: string, first: ChatMsg[], who: string | null) => {
    write(TOKEN_KEY, t);
    write(EMAIL_KEY, who);
    setEmail(who);
    last.current = first.at(-1)?.id ?? 0;
    all.current = first;
    setMsgs(first);
    setToken(t);
  };

  const send = async (body: string): Promise<string | null> => {
    if (!token) return "No chat.";
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "send", token, message: body, page: location.pathname }),
    }).catch(() => null);
    const data = (await res?.json().catch(() => null)) as { message?: ChatMsg; error?: string } | null;
    if (res?.status === 404) { write(TOKEN_KEY, null); setToken(null); all.current = []; setMsgs([]); }
    if (!res?.ok || !data?.message) return data?.error ?? "Couldn't send. Check your connection.";
    const m = data.message;
    last.current = Math.max(last.current, m.id);
    if (!all.current.some((y) => y.id === m.id)) all.current = [...all.current, m];
    setMsgs(all.current);
    setNow(Date.now());
    return null;
  };

  const lastMsg = msgs.at(-1);
  const waiting = !!lastMsg && lastMsg.sender === "visitor" && now - new Date(lastMsg.created_at).getTime() >= AWAY_MS;
  const unread = msgs.filter((m) => m.sender === "team" && m.id > seen).length;
  return { token, msgs, unread, waiting, email, begin, send };
}

/** The first message: name and email for visitors who aren't signed in, so a reply can reach them if they leave. */
export function ChatStart({ signedIn, question, onStarted, onUnavailable }: {
  signedIn: { name: string; email: string } | null;
  question: string;
  onStarted: (token: string, msgs: ChatMsg[], email: string | null) => void;
  onUnavailable?: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "start", name: f.get("name") ?? signedIn?.name, email: f.get("email"), message: f.get("message"), website: f.get("website"),
        page: location.pathname, anon: anonId(), context: { lastQuestion: question, device: window.innerWidth < 768 ? "phone" : "laptop" },
      }),
    }).catch(() => null);
    const data = (await res?.json().catch(() => null)) as { token?: string; messages?: ChatMsg[]; error?: string } | null;
    setBusy(false);
    if (res?.ok && data?.token) return onStarted(data.token, data.messages ?? [], String(f.get("email") ?? signedIn?.email ?? "") || null);
    if (res?.status === 503 && onUnavailable) return onUnavailable();
    setError(data?.error ?? "Couldn't start the chat. Check your connection.");
  }

  const field = "w-full rounded-xl bg-surface px-3 py-2 text-sm text-ink outline-none ring-1 ring-line/40 placeholder:text-muted focus:ring-2 focus:ring-red-strong/50";
  return (
    <form onSubmit={submit} className="space-y-2 rounded-2xl bg-card p-3.5 shadow-card ring-1 ring-line/30">
      <p className="text-sm font-extrabold text-ink">Talk to our team</p>
      <p className="text-xs text-muted">A real person from Klymb replies right here. If you leave, we&apos;ll email you the reply.</p>
      {!signedIn && (
        <>
          <input name="name" placeholder="Your name" maxLength={80} required className={field} aria-label="Your name" />
          <input name="email" type="email" required placeholder="Your email" maxLength={254} className={field} aria-label="Your email" />
        </>
      )}
      <textarea name="message" required maxLength={2000} rows={3} defaultValue={question} placeholder="What can we help with?" className={clsx(field, "resize-none")} aria-label="Your message" />
      <input name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
      {error && <p role="alert" className="text-xs font-semibold text-red-deep">{error}</p>}
      <button type="submit" disabled={busy} className="w-full rounded-full bg-red-strong py-2 text-sm font-bold text-white transition-[background-color,transform] duration-150 hover:bg-red-press active:scale-[0.97] disabled:opacity-60">
        {busy ? "Starting…" : "Start chat"}
      </button>
    </form>
  );
}

const time = (iso: string) => new Date(iso).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });

/** The conversation: the visitor on the right, the team on the left. */
export function ChatThreadView({ msgs, waiting, email }: { msgs: ChatMsg[]; waiting: boolean; email: string | null }) {
  return (
    <div className="space-y-3">
      <p className="text-center text-[11px] font-semibold text-muted">You&apos;re chatting with the Klymb team</p>
      {msgs.map((m) =>
        m.sender === "team" ? (
          <div key={m.id} className="flex items-end gap-2">
            <span aria-hidden="true" className="grid size-8 shrink-0 place-items-center rounded-full bg-red-strong text-xs font-extrabold text-white">K</span>
            <div className="max-w-[85%]">
              <p className="mb-0.5 text-[11px] font-bold text-muted">Klymb team · {time(m.created_at)}</p>
              <div className="whitespace-pre-wrap rounded-2xl rounded-bl-sm bg-card px-3.5 py-2.5 text-sm leading-relaxed text-ink shadow-card ring-1 ring-line/30">{m.body}</div>
            </div>
          </div>
        ) : (
          <div key={m.id} className="flex flex-col items-end">
            <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-sm bg-ink px-3.5 py-2.5 text-sm font-semibold leading-relaxed text-white">{m.body}</div>
            <p className="mt-0.5 text-[11px] text-muted">{time(m.created_at)}</p>
          </div>
        ),
      )}
      {waiting && (
        <p className="rounded-xl bg-card px-3 py-2 text-xs text-muted ring-1 ring-line/30">
          Our team usually replies within a few hours. You can close this: the reply shows up here, and we&apos;ll also email you{email ? ` at ${email}` : ""}.
        </p>
      )}
    </div>
  );
}
