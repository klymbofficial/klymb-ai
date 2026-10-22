"use client";

import clsx from "clsx";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Mascot } from "page-mascot";
import { useEffect, useMemo, useRef, useState } from "react";
import { SITE_CLOSED } from "@/lib/site-status";
import { searchSupport } from "@/lib/support-search";
import { SUPPORT_EMAIL, supportTopics, type SupportAnswer, type SupportTopic } from "@/data/support-faq";

/** What /api/support/me returns for an enrolled learner. */
interface Me {
  state: "enrolled";
  name: string;
  email: string;
  track: string;
  day: number;
  submitted: number;
  streak: number;
  lock: "open" | "previous" | "pay";
  rework: number[];
  missing: string[];
}

type Msg =
  | { id: number; from: "you"; text: string }
  | { id: number; from: "kamran"; kind: "text"; lines: string[]; action?: SupportAnswer["action"] }
  | { id: number; from: "kamran"; kind: "answer"; item: SupportAnswer; rated?: "up" | "down" }
  | { id: number; from: "kamran"; kind: "suggest"; items: SupportAnswer[] }
  | { id: number; from: "kamran"; kind: "topics" }
  | { id: number; from: "kamran"; kind: "topic"; topic: SupportTopic }
  | { id: number; from: "kamran"; kind: "handoff"; question: string };

/** A message before it gets its id (Omit spread over each kind of message). */
type Draft = Msg extends infer M ? (M extends Msg ? Omit<M, "id"> : never) : never;

let seq = 0;
const nextId = () => ++seq;

/**
 * Kamran, the support bot. Smart FAQ, no AI: type a question (English or
 * Hinglish, typos forgiven) or browse topics. Signed-in learners get a
 * progress card and answers about their own day. Anything Kamran can't
 * answer goes to the team as a ticket (emailed to team@klymb.ai and listed
 * in /admin/support), with the learner's progress attached.
 */
export function SupportBot() {
  const pathname = usePathname() ?? "/";
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [typing, setTyping] = useState(false);
  const [input, setInput] = useState("");
  const [me, setMe] = useState<Me | null>(null);
  const lastQuestion = useRef("");
  const scroller = useRef<HTMLDivElement>(null);
  const launcher = useRef<HTMLButtonElement>(null);
  const learner = pathname.startsWith("/learn");

  const topics = useMemo(() => {
    const rank = (t: SupportTopic) => (t.audience === (learner ? "learner" : "public") ? 0 : t.audience === "both" ? 1 : 2);
    return [...supportTopics()].sort((a, b) => rank(a) - rank(b));
  }, [learner]);
  const answers = useMemo(() => topics.flatMap((t) => t.items), [topics]);

  // Learner context, fetched once when the chat first opens on a learner page.
  useEffect(() => {
    if (!open || !learner || me) return;
    fetch("/api/support/me", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d?.state === "enrolled" && setMe(d))
      .catch(() => {});
  }, [open, learner, me]);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [msgs, typing]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setOpen(false); launcher.current?.focus(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (pathname.startsWith("/admin") || (SITE_CLOSED && !learner)) return null;

  const greeting = (): Msg[] => [
    { id: nextId(), from: "kamran", kind: "text", lines: [learner ? "Hi! Stuck on something? Type your question, or pick a topic." : "Hi, I'm Kamran. Ask me anything about Klymb and how the 30 days work."] },
    { id: nextId(), from: "kamran", kind: "topics" },
  ];

  /** The learner-specific line for an answer, if there is one. */
  const personal = (id: string): Draft[] => {
    const p = personalLine(id, me);
    return p ? [{ from: "kamran", kind: "text", lines: [p.text], action: p.action }] : [];
  };

  /** Kamran "types" for a beat, so replies don't land before the question. */
  const reply = (...next: Draft[]) => {
    setTyping(true);
    window.setTimeout(() => {
      setTyping(false);
      setMsgs((m) => [...m, ...next.map((n) => ({ ...n, id: nextId() }) as Msg)]);
    }, 450);
  };

  const showAnswer = (item: SupportAnswer, asked = item.question) => {
    lastQuestion.current = asked;
    setMsgs((m) => [...m, { id: nextId(), from: "you", text: asked }]);
    reply(...personal(item.id), { from: "kamran", kind: "answer", item });
  };

  const ask = (raw: string) => {
    const q = raw.trim();
    if (!q) return;
    setInput("");
    lastQuestion.current = q;
    setMsgs((m) => [...m, { id: nextId(), from: "you", text: q }]);

    const mine = me && /\b(my|mera|meri|mujhe|progress|kitne|streak|status)\b/i.test(q) && /\b(progress|day|streak|status|kahan|where|done|kitne)\b/i.test(q);
    if (me && mine) return reply({ from: "kamran", kind: "text", lines: progressLines(me), action: { label: `Open Day ${me.day}`, href: `/learn/day/${me.day}` } });

    const hits = searchSupport(q, answers, 3);
    if (!hits.length) {
      return reply(
        { from: "kamran", kind: "text", lines: ["Hmm, I don't know that one yet. Want me to pass it to the team? A person will reply by email."] },
        { from: "kamran", kind: "handoff", question: lastQuestion.current },
      );
    }
    const [best, ...rest] = hits;
    const clear = !rest.length || best.score >= rest[0].score * 1.5;
    if (clear) {
      return reply(...personal(best.item.id), { from: "kamran", kind: "answer", item: best.item });
    }
    reply({ from: "kamran", kind: "suggest", items: hits.map((h) => h.item) });
  };

  const rate = (id: number, rated: "up" | "down") => {
    setMsgs((m) => m.map((x) => (x.id === id && x.from === "kamran" && x.kind === "answer" ? { ...x, rated } : x)));
    if (rated === "down") reply({ from: "kamran", kind: "text", lines: ["Sorry about that. Want to ask the team instead?"] }, { from: "kamran", kind: "handoff", question: lastQuestion.current });
  };

  const close = () => setOpen(false);
  const restart = () => { setMsgs(greeting()); lastQuestion.current = ""; };

  // The wrapper never takes taps: only the open panel and the launcher do, so the
  // closed panel's invisible box can't cover buttons underneath it.
  return (
    <div
      className={clsx(
        "pointer-events-none fixed right-4 z-[60] flex flex-col items-end gap-3 sm:right-6",
        // The System Design app has a tab bar and mini player along the bottom.
        pathname.startsWith("/learn/system-design") ? "bottom-36 lg:bottom-28" : pathname === "/" ? "bottom-20 lg:bottom-6" : "bottom-5 sm:bottom-6",
      )}
    >
      <div
        role="dialog"
        aria-label="Help from Kamran"
        aria-hidden={!open}
        className={clsx(
          "flex h-[min(38rem,calc(100dvh-7rem))] w-[min(24rem,calc(100vw-2rem))] origin-bottom-right flex-col overflow-hidden rounded-[1.25rem] bg-card shadow-[0_24px_60px_rgba(32,30,29,0.22)] ring-1 ring-line/40",
          "transition-[opacity,transform,visibility] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]",
          open ? "pointer-events-auto scale-100 opacity-100" : "invisible scale-95 opacity-0",
        )}
      >
        <div className="flex items-center gap-3 bg-gradient-to-br from-red via-red-press to-[#2a0204] px-4 py-3 text-white">
          <Mascot directions="/mascots/kamran-directions.webp" reactions="/mascots/kamran-reactions.webp" size={52} label="Kamran" className="shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="font-extrabold leading-tight">Kamran</p>
            <p className="text-xs text-white/75">{me ? `Hi ${me.name} · ${me.track}` : "Klymb study buddy · answers in seconds"}</p>
          </div>
          {msgs.length > 2 && (
            <button type="button" onClick={restart} aria-label="Start over" className="grid size-8 place-items-center rounded-full text-white/80 transition-colors hover:bg-white/15 hover:text-white">
              <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true"><path d="M4 12a8 8 0 1 0 2.4-5.7M4 4v4h4" /></svg>
            </button>
          )}
          <button type="button" onClick={close} aria-label="Close help" className="grid size-8 place-items-center rounded-full text-white/80 transition-colors hover:bg-white/15 hover:text-white">
            <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
          </button>
        </div>

        <div ref={scroller} aria-live="polite" className="flex-1 space-y-3 overflow-y-auto bg-surface/60 px-4 py-4">
          {me && <ProgressCard me={me} />}

          {msgs.map((m) => {
            if (m.from === "you") return <Bubble key={m.id} from="you">{m.text}</Bubble>;
            switch (m.kind) {
              case "text":
                return (
                  <div key={m.id} className="space-y-2">
                    <Bubble from="kamran">{m.lines.map((l, i) => <p key={i} className={i ? "mt-2" : undefined}>{l}</p>)}</Bubble>
                    {m.action && <ActionLink action={m.action} onClick={close} />}
                  </div>
                );
              case "answer":
                return (
                  <div key={m.id} className="space-y-2">
                    <Bubble from="kamran">{m.item.answer.map((l, i) => <p key={i} className={i ? "mt-2" : undefined}>{l}</p>)}</Bubble>
                    {m.item.action && <ActionLink action={m.item.action} onClick={close} />}
                    <div className="ml-10 flex items-center gap-1.5 text-xs text-muted">
                      {m.rated ? (
                        <span>{m.rated === "up" ? "Glad that helped!" : "Thanks for telling me."}</span>
                      ) : (
                        <>
                          <span>Did this help?</span>
                          <RateButton label="Yes, helpful" onClick={() => rate(m.id, "up")}>👍</RateButton>
                          <RateButton label="No, not helpful" onClick={() => rate(m.id, "down")}>👎</RateButton>
                        </>
                      )}
                    </div>
                  </div>
                );
              case "suggest":
                return (
                  <div key={m.id} className="space-y-2">
                    <Bubble from="kamran">Did you mean one of these?</Bubble>
                    <ul className="flex flex-col gap-2">
                      {m.items.map((it) => <li key={it.id}><Choice onClick={() => showAnswer(it)}>{it.question}</Choice></li>)}
                      <li><Choice onClick={() => reply({ from: "kamran", kind: "handoff", question: lastQuestion.current })}>None of these: ask the team</Choice></li>
                    </ul>
                  </div>
                );
              case "topics":
                return (
                  <div key={m.id} className="flex flex-wrap gap-2 pl-10">
                    {topics.map((t) => (
                      <Chip key={t.id} onClick={() => { setMsgs((x) => [...x, { id: nextId(), from: "you", text: t.title }]); reply({ from: "kamran", kind: "topic", topic: t }); }}>{t.title}</Chip>
                    ))}
                  </div>
                );
              case "topic":
                return (
                  <div key={m.id} className="space-y-2">
                    <Bubble from="kamran">Sure, {m.topic.title.toLowerCase()}. What would you like to know?</Bubble>
                    <ul className="flex flex-col gap-2">
                      {m.topic.items.map((it) => <li key={it.id}><Choice onClick={() => showAnswer(it)}>{it.question}</Choice></li>)}
                    </ul>
                  </div>
                );
              case "handoff":
                return <HandoffForm key={m.id} me={me} lastQuestion={m.question} page={pathname} />;
            }
          })}

          {typing && (
            <div className="flex items-end gap-2" aria-label="Kamran is typing">
              <Image src="/mascots/kamran-excited-v2.png" alt="" width={32} height={32} className="size-8 shrink-0 rounded-full" />
              <div className="flex gap-1 rounded-2xl rounded-bl-sm bg-card px-3.5 py-3 shadow-card ring-1 ring-line/30">
                {[0, 1, 2].map((i) => <span key={i} className="size-1.5 animate-bounce rounded-full bg-muted" style={{ animationDelay: `${i * 120}ms` }} />)}
              </div>
            </div>
          )}
        </div>

        <form
          onSubmit={(e) => { e.preventDefault(); ask(input); }}
          className="flex items-center gap-2 border-t border-line/30 bg-card px-3 py-2.5"
        >
          <label htmlFor="kamran-ask" className="sr-only">Ask Kamran</label>
          <input
            id="kamran-ask"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your question…"
            maxLength={300}
            autoComplete="off"
            tabIndex={open ? 0 : -1}
            className="min-w-0 flex-1 rounded-full bg-surface px-4 py-2.5 text-sm text-ink outline-none ring-1 ring-line/40 placeholder:text-muted focus:ring-2 focus:ring-red-strong/50"
          />
          <button
            type="submit"
            disabled={!input.trim()}
            aria-label="Send"
            className="grid size-10 shrink-0 place-items-center rounded-full bg-red-strong text-white transition-[background-color,transform,opacity] duration-150 hover:bg-red-press active:scale-[0.95] disabled:opacity-40"
          >
            <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
          </button>
        </form>
      </div>

      <button
        ref={launcher}
        type="button"
        onClick={() => {
          if (!open && !msgs.length) setMsgs(greeting());
          setOpen(!open);
        }}
        aria-expanded={open}
        aria-label={open ? "Close help" : "Help: ask Kamran"}
        className="group pointer-events-auto relative grid size-16 place-items-center rounded-full bg-card shadow-[0_10px_30px_rgba(32,30,29,0.25)] ring-2 ring-white transition-transform duration-150 hover:-translate-y-0.5 active:scale-95"
      >
        <Image src="/mascots/kamran-excited-v2.png" alt="" width={64} height={64} className="size-16 rounded-full object-cover" />
        {!open && (
          <span className="pointer-events-none absolute right-full mr-3 hidden whitespace-nowrap rounded-full bg-ink px-3 py-1.5 text-xs font-bold text-white shadow-card group-hover:block sm:block">
            Need help?
          </span>
        )}
      </button>
    </div>
  );
}

/** A line about the learner's own situation, shown before the general answer. */
function personalLine(id: string, me: Me | null): { text: string; action?: SupportAnswer["action"] } | null {
  if (!me) return null;
  const prev = me.day - 1;
  switch (id) {
    case "locked":
    case "missed":
      if (me.lock === "pay") return { text: `${me.name}, Day ${me.day} needs payment to open.`, action: { label: "Open my dashboard", href: "/learn" } };
      if (me.lock === "previous") return { text: `${me.name}, Day ${prev} isn't submitted yet, so Day ${me.day} is waiting for it.`, action: { label: `Open Day ${prev}`, href: `/learn/day/${prev}` } };
      return { text: `Good news ${me.name}: your next day, Day ${me.day}, is open now.`, action: { label: `Open Day ${me.day}`, href: `/learn/day/${me.day}` } };
    case "profile":
    case "not-mine":
      return me.missing.length
        ? { text: `You still need to add your ${me.missing.join(" and ")} on your dashboard.`, action: { label: "Add it now", href: "/learn" } }
        : { text: "Your GitHub and LinkedIn are both added. ✓" };
    case "feedback":
      return me.rework.length ? { text: `Day ${me.rework.join(", Day ")} ${me.rework.length > 1 ? "are" : "is"} marked Needs rework.`, action: { label: `Open Day ${me.rework[0]}`, href: `/learn/day/${me.rework[0]}` } } : null;
    case "checkpoints": {
      const next = [7, 14, 21, 28].find((d) => d >= me.day);
      return next ? { text: `Your next checkpoint is Day ${next}${next === me.day ? ", which is today" : `, ${next - me.day} day${next - me.day > 1 ? "s" : ""} away`}.` } : null;
    }
    case "mock":
      return me.day < 29 ? { text: `You're on Day ${me.day}, so interview prep starts in ${29 - me.day} days.` } : null;
    default:
      return null;
  }
}

function progressLines(me: Me) {
  return [
    `You're on Day ${me.day} of 30 in ${me.track}, with ${me.submitted} day${me.submitted === 1 ? "" : "s"} submitted.`,
    me.streak >= 2 ? `${me.streak}-day streak. Keep it going!` : "Submit today's day to start a streak.",
    ...(me.rework.length ? [`Needs rework: Day ${me.rework.join(", ")}.`] : []),
    ...(me.missing.length ? [`Still to add on your dashboard: ${me.missing.join(" and ")}.`] : []),
  ];
}

function ProgressCard({ me }: { me: Me }) {
  const pct = Math.round((me.submitted / 30) * 100);
  return (
    <Link href={`/learn/day/${me.day}`} className="block rounded-2xl bg-card p-3.5 shadow-card ring-1 ring-line/30 transition-transform active:scale-[0.98]">
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-extrabold text-ink">Day {me.day} of 30</span>
        <span className="text-xs font-semibold text-muted">{me.streak >= 2 ? `🔥 ${me.streak}-day streak` : `${me.submitted} submitted`}</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Course progress">
        <div className="h-full rounded-full bg-red-strong" style={{ width: `${Math.max(pct, 3)}%` }} />
      </div>
      {(me.missing.length > 0 || me.rework.length > 0) && (
        <p className="mt-2 text-xs font-semibold text-red-deep">
          {me.missing.length ? `Add your ${me.missing.join(" and ")} →` : `Day ${me.rework[0]} needs rework →`}
        </p>
      )}
    </Link>
  );
}

function HandoffForm({ me, lastQuestion, page }: { me: Me | null; lastQuestion: string; page: string }) {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setState("sending");
    const context = me ? { track: me.track, day: me.day, submitted: me.submitted, streak: me.streak, lock: me.lock, rework: me.rework, missing: me.missing, lastQuestion } : { lastQuestion };
    const res = await fetch("/api/support/ticket", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: f.get("name"), email: f.get("email"), message: f.get("message"), website: f.get("website"), page, context }),
    }).catch(() => null);
    const data = await res?.json().catch(() => null);
    if (res?.ok) return setState("sent");
    setError(data?.error ?? `Couldn't send. Email ${SUPPORT_EMAIL} instead.`);
    setState("error");
  }

  if (state === "sent") {
    return <Bubble from="kamran">Sent! The team will reply to {me?.email ?? "your email"}, usually within a day. 🙌</Bubble>;
  }

  const field = "w-full rounded-xl bg-surface px-3 py-2 text-sm text-ink outline-none ring-1 ring-line/40 placeholder:text-muted focus:ring-2 focus:ring-red-strong/50";
  return (
    <form onSubmit={submit} className="ml-10 space-y-2 rounded-2xl bg-card p-3.5 shadow-card ring-1 ring-line/30">
      <p className="text-sm font-extrabold text-ink">Ask the team</p>
      {!me && (
        <>
          <input name="name" placeholder="Your name" maxLength={80} className={field} aria-label="Your name" />
          <input name="email" type="email" required placeholder="Email to reply to" maxLength={254} className={field} aria-label="Email to reply to" />
        </>
      )}
      <textarea name="message" required minLength={5} maxLength={2000} rows={3} defaultValue={lastQuestion} className={clsx(field, "resize-none")} aria-label="Your question" />
      <input name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
      {state === "error" && <p className="text-xs font-semibold text-red-deep">{error}</p>}
      <button type="submit" disabled={state === "sending"} className="w-full rounded-full bg-red-strong py-2 text-sm font-bold text-white transition-[background-color,transform] duration-150 hover:bg-red-press active:scale-[0.97] disabled:opacity-60">
        {state === "sending" ? "Sending…" : "Send to the team"}
      </button>
      {me && <p className="text-[11px] text-muted">Your progress is attached so we can help faster.</p>}
    </form>
  );
}

function Bubble({ from, children }: { from: "kamran" | "you"; children: React.ReactNode }) {
  return from === "kamran" ? (
    <div className="flex items-end gap-2">
      <Image src="/mascots/kamran-excited-v2.png" alt="" width={32} height={32} className="size-8 shrink-0 rounded-full" />
      <div className="max-w-[85%] rounded-2xl rounded-bl-sm bg-card px-3.5 py-2.5 text-sm leading-relaxed text-ink shadow-card ring-1 ring-line/30">{children}</div>
    </div>
  ) : (
    <div className="flex justify-end">
      <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-ink px-3.5 py-2.5 text-sm font-semibold leading-relaxed text-white">{children}</div>
    </div>
  );
}

function ActionLink({ action, onClick }: { action: NonNullable<SupportAnswer["action"]>; onClick: () => void }) {
  const external = action.href.startsWith("http");
  const cls = "ml-10 inline-flex items-center gap-1.5 rounded-full bg-red-strong px-4 py-2 text-sm font-bold text-white transition-[background-color,transform] duration-150 hover:bg-red-press active:scale-[0.97]";
  return external ? (
    <a href={action.href} target="_blank" rel="noreferrer" className={cls}>{action.label} <span aria-hidden="true">↗</span></a>
  ) : (
    <Link href={action.href} onClick={onClick} className={cls}>{action.label} <span aria-hidden="true">→</span></Link>
  );
}

function Choice({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="ml-10 w-[calc(100%-2.5rem)] rounded-xl bg-card px-3.5 py-2.5 text-left text-sm font-semibold text-ink ring-1 ring-red-strong/25 transition-[background-color,transform] duration-150 hover:bg-red-tint active:scale-[0.98]">
      {children}
    </button>
  );
}

function Chip({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="rounded-full bg-card px-3 py-1.5 text-xs font-bold text-ink ring-1 ring-red-strong/30 transition-[background-color,transform] duration-150 hover:bg-red-tint active:scale-[0.96]">
      {children}
    </button>
  );
}

function RateButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} className="grid size-7 place-items-center rounded-full ring-1 ring-line/40 transition-[background-color,transform] hover:bg-surface active:scale-90">
      {children}
    </button>
  );
}
