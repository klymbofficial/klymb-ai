"use client";

import clsx from "clsx";
import { useEffect, useState } from "react";
import type { Day } from "@/data/system-design/types";
import { QNA_MAX, ago, type QnaFeed, type QnaQuestion, type QnaReply } from "@/lib/sd-qna";
import { Icon } from "../icons";
import { GoogleButton } from "../user";

/** While the tab is open and on screen; a lesson chat does not need to be faster than this. */
const REFRESH_MS = 15_000;

async function send(method: "POST" | "DELETE", url: string, body?: unknown): Promise<string | null> {
  try {
    const res = await fetch(url, { method, headers: body ? { "content-type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
    if (res.ok) return null;
    const j = (await res.json().catch(() => null)) as { error?: string } | null;
    return j?.error ?? "Something went wrong. Try again.";
  } catch {
    return "You look offline. Try again when you’re back.";
  }
}

function Composer({ placeholder, cta, onPost, autoFocus }: { placeholder: string; cta: string; onPost: (text: string) => Promise<string | null>; autoFocus?: boolean }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const post = async () => {
    if (!text.trim() || busy) return;
    setBusy(true);
    const e = await onPost(text);
    setBusy(false);
    setErr(e);
    if (!e) setText("");
  };
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-end gap-2">
        <textarea
          className="sd-input !min-h-11"
          rows={1}
          value={text}
          maxLength={QNA_MAX}
          aria-label={placeholder}
          placeholder={placeholder}
          autoFocus={autoFocus}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void post(); } }}
        />
        <button type="button" onClick={() => void post()} disabled={!text.trim() || busy} className="sd-btn sd-btn-primary h-11 flex-none">{cta}</button>
      </div>
      {err && <span role="alert" className="text-[13px] font-semibold text-sd-accent-700">{err}</span>}
    </div>
  );
}

function Post({ p, admin, onRemove, small }: { p: QnaReply; admin: boolean; onRemove: (id: string) => void; small?: boolean }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2 text-[12px] text-sd-n-700">
        <span className={clsx("font-extrabold", p.staff ? "text-sd-accent-800" : "text-sd-ink")}>{p.name}</span>
        {p.staff && <span className="sd-tag sd-tag-accent !px-1.5 !py-0 font-extrabold">Klymb team</span>}
        <span>{ago(p.at)}</span>
        {(p.mine || admin) && (
          <button
            type="button"
            onClick={() => { if (window.confirm(small ? "Remove this reply?" : "Remove this question and its replies?")) onRemove(p.id); }}
            className="ml-auto cursor-pointer text-sd-n-700 hover:text-sd-ink"
            aria-label="Remove"
            title="Remove"
          >
            <Icon name="trash" size={14} />
          </button>
        )}
      </div>
      <p className={clsx("m-0 whitespace-pre-wrap break-words leading-[1.45]", small ? "text-[13px]" : "text-sm")}>{p.body}</p>
    </div>
  );
}

function Thread({ q, feed, onReply, onRemove }: { q: QnaQuestion; feed: QnaFeed; onReply: (parent: string, text: string) => Promise<string | null>; onRemove: (id: string) => void }) {
  const [replying, setReplying] = useState(false);
  const n = q.replies.length;
  return (
    <div className="flex flex-col gap-2.5 border-b border-sd-divider py-3">
      <Post p={q} admin={feed.admin} onRemove={onRemove} />
      {n > 0 && (
        <div className="ml-1 flex flex-col gap-2.5 border-l-[3px] border-sd-divider pl-3">
          {q.replies.map((r) => <Post key={r.id} p={r} admin={feed.admin} onRemove={onRemove} small />)}
        </div>
      )}
      {feed.canPost && (replying
        ? <Composer placeholder="Write a reply" cta="Reply" autoFocus onPost={async (t) => { const e = await onReply(q.id, t); if (!e) setReplying(false); return e; }} />
        : (
          <button type="button" onClick={() => setReplying(true)} className="sd-btn sd-btn-ghost self-start !px-1 !py-0.5 text-[13px]">
            <Icon name="msg" size={14} />Reply{n ? ` · ${n}` : ""}
          </button>
        ))}
    </div>
  );
}

/**
 * The lesson's Q&A, as a community chat: learners ask and reply, the Klymb
 * team replies with a badge. Underneath, the doubts the lesson always raises,
 * answered, as before.
 *
 * Keyed by lesson where it is used, so a new lesson starts from an empty feed.
 */
export function Community({ lesson, day, lang }: { lesson: string; day: Day; lang: "en" | "hi" }) {
  const [feed, setFeed] = useState<QnaFeed | null>(null);
  const [failed, setFailed] = useState(false);
  // Bumped after a post or a removal, so the feed reloads straight away rather than on the next tick.
  const [version, setVersion] = useState(0);
  const reload = () => setVersion((v) => v + 1);
  const url = `/api/sd/qna?lesson=${encodeURIComponent(lesson)}`;

  useEffect(() => {
    let live = true;
    const load = () => fetch(url, { cache: "no-store" })
      .then((res) => (res.ok ? (res.json() as Promise<QnaFeed>) : Promise.reject(new Error(String(res.status)))))
      .then((f) => { if (live) { setFeed(f); setFailed(false); } })
      .catch(() => { if (live) setFailed(true); });
    load();
    const id = window.setInterval(() => { if (document.visibilityState === "visible") load(); }, REFRESH_MS);
    return () => { live = false; window.clearInterval(id); };
  }, [url, version]);

  const post = async (body: string, parent?: string) => {
    const e = await send("POST", "/api/sd/qna", { lesson, body, parent });
    if (!e) reload();
    return e;
  };
  const remove = async (id: string) => {
    const e = await send("DELETE", `/api/sd/qna?id=${id}`);
    if (e) window.alert(e);
    reload();
  };

  const faq = day.copy[lang].faq;
  return (
    <div className="flex flex-col px-5 py-3.5 lg:px-3.5 lg:pt-3">
      {/* No error text when the chat can't be reached: the common questions below still answer, and the feed retries on its own. */}
      {!feed && !failed && <div className="py-3 text-[13px] text-sd-n-700">Loading questions…</div>}
      {feed && (feed.canPost
        ? <Composer placeholder="Ask a question about this lesson" cta="Ask" onPost={(t) => post(t)} />
        : (
          <div className="flex flex-col gap-2 rounded-lg bg-sd-surface p-3">
            <span className="text-[13px] text-sd-n-800">Sign in to ask or reply.</span>
            <GoogleButton lesson={lesson} where="qna" />
          </div>
        ))}
      {feed && (
        <div className="mt-1 flex flex-col">
          {feed.questions.map((q) => <Thread key={q.id} q={q} feed={feed} onReply={(parent, t) => post(t, parent)} onRemove={(id) => void remove(id)} />)}
          {!feed.questions.length && <div className="py-3 text-[13px] text-sd-n-700">No questions yet.</div>}
        </div>
      )}
      {faq.length > 0 && (
        <>
          <span className="sd-kicker mt-5 mb-1 text-sd-n-700">Common questions</span>
          {faq.map((x) => (
            <details key={x.q} className="group border-b border-sd-divider">
              <summary className="flex cursor-pointer list-none items-start justify-between gap-2.5 py-3 text-sm leading-[1.35] font-extrabold [&::-webkit-details-marker]:hidden">
                {x.q}
                <Icon name="down" size={16} className="mt-0.5 block flex-none transition-transform group-open:rotate-180" />
              </summary>
              <p className="m-0 pb-3 text-[13px] leading-[1.5] text-sd-n-800">{x.a}</p>
            </details>
          ))}
        </>
      )}
    </div>
  );
}
