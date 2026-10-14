"use client";

import clsx from "clsx";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Mascot } from "page-mascot";
import { useEffect, useMemo, useRef, useState } from "react";
import { SITE_CLOSED } from "@/lib/site-status";
import { SUPPORT_EMAIL, supportTopics, type SupportAnswer, type SupportTopic } from "@/data/support-faq";

type View = { kind: "home" } | { kind: "topic"; topic: SupportTopic } | { kind: "answer"; topic: SupportTopic; item: SupportAnswer };

/**
 * Kamran, the support bot: a guided FAQ, no AI. Topics, then questions, then
 * the answer as a chat bubble with one next step. Learner pages lead with
 * account and app help; the public site leads with price and refund. Always
 * offers a real person by email. Hidden in admin.
 */
export function SupportBot() {
  const pathname = usePathname() ?? "/";
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>({ kind: "home" });
  const panel = useRef<HTMLDivElement>(null);
  const launcher = useRef<HTMLButtonElement>(null);
  const learner = pathname.startsWith("/learn");

  const topics = useMemo(() => {
    const all = supportTopics();
    const rank = (t: SupportTopic) => (t.audience === (learner ? "learner" : "public") ? 0 : t.audience === "both" ? 1 : 2);
    return [...all].sort((a, b) => rank(a) - rank(b));
  }, [learner]);

  // Escape closes and returns focus to Kamran.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setOpen(false); launcher.current?.focus(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => { panel.current?.scrollTo({ top: 0 }); }, [view]);

  // Hidden in admin, and on public pages while the site is closed (they show the "back soon" page).
  if (pathname.startsWith("/admin") || (SITE_CLOSED && !learner)) return null;

  const close = () => { setOpen(false); setView({ kind: "home" }); };

  return (
    <div className={clsx("fixed right-4 z-[60] flex flex-col items-end gap-3 sm:right-6", pathname === "/" ? "bottom-20 lg:bottom-6" : "bottom-5 sm:bottom-6")}>
      <div
        role="dialog"
        aria-label="Help from Kamran"
        aria-hidden={!open}
        className={clsx(
          "flex max-h-[min(34rem,calc(100dvh-7rem))] w-[min(23rem,calc(100vw-2rem))] origin-bottom-right flex-col overflow-hidden rounded-[1.25rem] bg-card shadow-[0_24px_60px_rgba(32,30,29,0.22)] ring-1 ring-line/40",
          "transition-[opacity,transform] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]",
          open ? "scale-100 opacity-100" : "pointer-events-none scale-95 opacity-0",
        )}
      >
        {/* Header: Kamran follows the cursor, as on the dashboard. */}
        <div className="flex items-center gap-3 bg-gradient-to-br from-red via-red-press to-[#2a0204] px-4 py-3 text-white">
          <Mascot directions="/mascots/kamran-directions.webp" reactions="/mascots/kamran-reactions.webp" size={52} label="Kamran" className="shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="font-extrabold leading-tight">Kamran</p>
            <p className="text-xs text-white/75">Klymb study buddy · answers in seconds</p>
          </div>
          <button type="button" onClick={close} aria-label="Close help" className="grid size-8 place-items-center rounded-full text-white/80 transition-colors hover:bg-white/15 hover:text-white">
            <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
          </button>
        </div>

        <div ref={panel} className="flex-1 space-y-3 overflow-y-auto bg-surface/60 px-4 py-4">
          <Bubble from="kamran">
            {view.kind === "home"
              ? learner ? "Hi! Stuck on something? Pick a topic and I'll help." : "Hi, I'm Kamran. Ask me anything about Klymb and how the 30 days work."
              : view.kind === "topic" ? `Sure, ${view.topic.title.toLowerCase()}. What would you like to know?` : null}
          </Bubble>

          {view.kind === "home" && (
            <ul className="flex flex-col gap-2">
              {topics.map((t) => (
                <li key={t.id}><Choice onClick={() => setView({ kind: "topic", topic: t })}>{t.title}</Choice></li>
              ))}
            </ul>
          )}

          {view.kind === "topic" && (
            <ul className="flex flex-col gap-2">
              {view.topic.items.map((item) => (
                <li key={item.question}><Choice onClick={() => setView({ kind: "answer", topic: view.topic, item })}>{item.question}</Choice></li>
              ))}
            </ul>
          )}

          {view.kind === "answer" && (
            <>
              <Bubble from="you">{view.item.question}</Bubble>
              <Bubble from="kamran">
                {view.item.answer.map((line, i) => <p key={i} className={i ? "mt-2" : undefined}>{line}</p>)}
              </Bubble>
              {view.item.action && (
                <Link
                  href={view.item.action.href}
                  onClick={close}
                  className="ml-10 inline-flex items-center gap-1.5 rounded-full bg-red-strong px-4 py-2 text-sm font-bold text-white transition-[background-color,transform] duration-150 hover:bg-red-press active:scale-[0.97]"
                >
                  {view.item.action.label} <span aria-hidden="true">→</span>
                </Link>
              )}
            </>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-line/30 bg-card px-4 py-2.5 text-xs">
          {view.kind === "home" ? (
            <span className="text-muted">Still stuck?</span>
          ) : (
            <button type="button" onClick={() => setView(view.kind === "answer" ? { kind: "topic", topic: view.topic } : { kind: "home" })} className="font-semibold text-muted underline underline-offset-2 hover:text-ink">
              ← Back
            </button>
          )}
          <a href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("Help with Klymb")}`} className="font-bold text-red-deep underline underline-offset-2">
            Email a person
          </a>
        </div>
      </div>

      <button
        ref={launcher}
        type="button"
        onClick={() => (open ? close() : setOpen(true))}
        aria-expanded={open}
        aria-label={open ? "Close help" : "Help: ask Kamran"}
        className="group relative grid size-16 place-items-center rounded-full bg-card shadow-[0_10px_30px_rgba(32,30,29,0.25)] ring-2 ring-white transition-transform duration-150 hover:-translate-y-0.5 active:scale-95"
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

function Bubble({ from, children }: { from: "kamran" | "you"; children: React.ReactNode }) {
  if (!children) return null;
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

function Choice({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="ml-10 w-[calc(100%-2.5rem)] rounded-xl bg-card px-3.5 py-2.5 text-left text-sm font-semibold text-ink ring-1 ring-red-strong/25 transition-[background-color,transform] duration-150 hover:bg-red-tint active:scale-[0.98]"
    >
      {children}
    </button>
  );
}
