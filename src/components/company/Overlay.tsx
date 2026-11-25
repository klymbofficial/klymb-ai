"use client";

import clsx from "clsx";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { BTN_PRIMARY, BTN_SECONDARY } from "@/components/company/HiringParts";

/**
 * One overlay for the workspace (P0.2): a centred modal, or a drawer from the
 * right (or left, for the menu). It animates in and out (about 200 ms,
 * transform and opacity; none with reduced motion) and stays mounted until
 * its exit animation ends. While open: a visible close X, Escape closes,
 * Tab stays inside, the page behind doesn't scroll, and focus returns to
 * whatever opened it. With `dirty`, closing asks first, on the overlay
 * itself, so a half-filled form isn't lost by accident.
 */

export const OVERLAY_MS = 220;
let locks = 0;

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/**
 * Keeps something mounted through its exit animation. `shown` is simply
 * `open`: the entry animates from CSS @starting-style (Tailwind's
 * `starting:` classes), so it never waits on animation frames, which a busy
 * or background page can delay; the exit is the class change, with the
 * element removed once it has run.
 */
export function usePresence(open: boolean, ms = OVERLAY_MS) {
  const [mounted, setMounted] = useState(open);
  if (open && !mounted) setMounted(true);
  useEffect(() => {
    if (open) return;
    const t = window.setTimeout(() => setMounted(false), ms);
    return () => window.clearTimeout(t);
  }, [open, ms]);
  return { mounted, shown: open };
}

/** Escape, the Tab trap, the scroll lock and focus in and out, for a mounted overlay panel. */
export function useOverlayFocus(active: boolean, panel: React.RefObject<HTMLElement | null>, onEscape: () => void) {
  const escape = useRef(onEscape);
  useEffect(() => { escape.current = onEscape; });
  useEffect(() => {
    if (!active) return;
    const opener = document.activeElement as HTMLElement | null;
    locks += 1;
    const before = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const first = panel.current?.querySelector<HTMLElement>("[data-autofocus]") ?? panel.current?.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? panel.current)?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (!panel.current) return;
      // Only the topmost overlay answers (a confirm over a drawer).
      const all = document.querySelectorAll("[data-overlay-panel]");
      if (all[all.length - 1] !== panel.current) return;
      if (e.key === "Escape") { e.preventDefault(); escape.current(); return; }
      if (e.key !== "Tab") return;
      const items = [...panel.current.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((x) => x.offsetParent !== null || x === document.activeElement);
      if (!items.length) { e.preventDefault(); return; }
      const [a, z] = [items[0], items[items.length - 1]];
      if (e.shiftKey && (document.activeElement === a || !panel.current.contains(document.activeElement))) { e.preventDefault(); z.focus(); }
      else if (!e.shiftKey && (document.activeElement === z || !panel.current.contains(document.activeElement))) { e.preventDefault(); a.focus(); }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      locks -= 1;
      if (locks === 0) document.body.style.overflow = before === "hidden" ? "" : before;
      if (opener && document.contains(opener)) opener.focus();
    };
  }, [active, panel]);
}

export function CloseX({ onClick, label = "Close", dark = false }: { onClick: () => void; label?: string; dark?: boolean }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={clsx("flex h-11 w-11 shrink-0 items-center justify-center rounded-md", dark ? "hover:bg-white/10" : "text-ink hover:bg-line/20")}
    >
      <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
    </button>
  );
}

export function Overlay({
  open, onClose, title, description, kind = "modal", side = "right", size = "md", dirty = false, children, footer, panelClassName, role = "dialog",
}: {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  kind?: "modal" | "drawer";
  side?: "right" | "left";
  size?: "sm" | "md" | "lg";
  /** Unsaved changes: closing asks before throwing them away. */
  dirty?: boolean;
  children: React.ReactNode;
  footer?: React.ReactNode;
  panelClassName?: string;
  role?: "dialog" | "alertdialog";
}) {
  const { mounted, shown } = usePresence(open);
  const panel = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descId = useId();
  const [asking, setAsking] = useState(false);
  const keep = useRef<HTMLButtonElement>(null);
  // The discard question takes focus, so Enter or Escape answers it.
  useEffect(() => { if (asking) keep.current?.focus(); }, [asking]);
  const requestClose = useCallback(() => {
    if (dirty && !asking) setAsking(true);
    else { setAsking(false); onClose(); }
  }, [dirty, asking, onClose]);
  useOverlayFocus(mounted && open, panel, requestClose);
  if (!mounted || typeof document === "undefined") return null;

  const drawer = kind === "drawer";
  const width = drawer
    ? { sm: "w-[min(24rem,100vw)]", md: "w-[min(36rem,100vw)]", lg: "w-[min(52rem,100vw)]" }[size]
    : { sm: "w-[min(26rem,calc(100vw-2rem))]", md: "w-[min(40rem,calc(100vw-2rem))]", lg: "w-[min(56rem,calc(100vw-2rem))]" }[size];

  return createPortal(
    <div className={clsx("fixed inset-0 z-50 flex", drawer ? (side === "right" ? "justify-end" : "justify-start") : "items-center justify-center p-4")}>
      <div
        aria-hidden="true"
        onClick={requestClose}
        className={clsx("absolute inset-0 bg-black/45 transition-opacity duration-200 motion-reduce:transition-none starting:opacity-0", shown ? "opacity-100" : "opacity-0")}
      />
      <div
        ref={panel}
        data-overlay-panel=""
        role={role}
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        className={clsx(
          "relative flex flex-col bg-paper text-ink shadow-2xl outline-none transition duration-200 ease-out motion-reduce:transition-none",
          width,
          drawer ? "h-full" : "max-h-[calc(100dvh-2rem)] rounded-lg",
          shown
            ? clsx("translate-x-0 translate-y-0 scale-100 opacity-100", drawer ? (side === "right" ? "starting:translate-x-full" : "starting:-translate-x-full") : "starting:translate-y-2 starting:scale-[0.98] starting:opacity-0")
            : drawer ? (side === "right" ? "translate-x-full" : "-translate-x-full") : "translate-y-2 scale-[0.98] opacity-0",
          panelClassName,
        )}
      >
        <div className="flex items-start justify-between gap-3 border-b border-line/25 py-2 pl-5 pr-2">
          <div className="min-w-0 py-2">
            <h2 id={titleId} className="text-lg font-bold leading-snug">{title}</h2>
            {description && <p id={descId} className="mt-0.5 text-sm text-muted">{description}</p>}
          </div>
          <CloseX onClick={requestClose} />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {asking ? (
          <div role="alert" className="flex flex-wrap items-center justify-between gap-3 border-t-2 border-error/40 bg-white px-5 py-3">
            <p className="text-sm font-semibold">Discard your changes?</p>
            <div className="flex gap-2">
              <button ref={keep} type="button" className={BTN_SECONDARY} onClick={() => setAsking(false)}>Keep editing</button>
              <button type="button" className={BTN_PRIMARY} onClick={() => { setAsking(false); onClose(); }}>Discard</button>
            </div>
          </div>
        ) : footer ? (
          <div className="border-t border-line/25 px-5 py-3">{footer}</div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}

export interface ConfirmOptions {
  title: string;
  body?: React.ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
}

/**
 * An in-app confirmation instead of window.confirm: `await confirm({...})`
 * resolves true only when the person presses the confirm button. Render the
 * returned element once in the component.
 */
export function useConfirm(): [(o: ConfirmOptions) => Promise<boolean>, React.ReactNode] {
  const [ask, setAsk] = useState<(ConfirmOptions & { resolve: (v: boolean) => void }) | null>(null);
  const [open, setOpen] = useState(false);
  const confirm = useCallback((o: ConfirmOptions) => new Promise<boolean>((resolve) => { setAsk({ ...o, resolve }); setOpen(true); }), []);
  const answer = (v: boolean) => { ask?.resolve(v); setOpen(false); };
  // Focus starts on the safe choice (data-autofocus on Cancel), so a stray Enter never confirms.
  const el = ask ? (
    <Overlay
      open={open}
      onClose={() => answer(false)}
      title={ask.title}
      size="sm"
      role="alertdialog"
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" className={BTN_SECONDARY} onClick={() => answer(false)} data-autofocus="">{ask.cancelLabel ?? "Cancel"}</button>
          <button type="button" className={BTN_PRIMARY} onClick={() => answer(true)}>{ask.confirmLabel}</button>
        </div>
      }
    >
      {ask.body ? <div className="whitespace-pre-line text-sm leading-relaxed">{ask.body}</div> : <span className="sr-only">{ask.title}</span>}
    </Overlay>
  ) : null;
  return [confirm, el];
}
