"use client";

import clsx from "clsx";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { signOutLearner } from "@/app/(learn)/learn/actions";
import { AdminLink } from "@/components/layout/AdminLink";

/**
 * The account button at the right of the learner bar: photo and name, opening
 * a small menu with the dashboard, admin (for the team) and log out. Escape or
 * a tap outside closes it.
 */
export function AccountMenu({ name, email, image }: { name: string; email?: string | null; image?: string | null }) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const initials = name.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => { if (!wrap.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("pointerdown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);

  const item = "block w-full rounded-lg px-3 py-2.5 text-left text-sm font-semibold transition-colors hover:bg-surface";

  return (
    <div ref={wrap} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={`Account: ${name}`}
        onClick={() => setOpen((o) => !o)}
        className="flex min-h-11 items-center gap-2 rounded-full py-1 pr-2 pl-1 transition-colors hover:bg-surface aria-expanded:bg-surface"
      >
        {image ? (
          <Image src={image} alt="" width={28} height={28} className="size-7 rounded-full object-cover" />
        ) : (
          <span aria-hidden="true" className="grid size-7 place-items-center rounded-full bg-surface text-xs font-extrabold">{initials || "?"}</span>
        )}
        <span className="hidden text-xs font-extrabold uppercase tracking-[0.04em] sm:inline">{name}</span>
        <svg viewBox="0 0 24 24" className={clsx("size-3.5 transition-transform duration-200", open && "rotate-180")} fill="none" stroke="currentColor" strokeWidth="2.6" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
      </button>

      {/* Mounted while closed, so the admin check has answered before it opens. */}
      <div hidden={!open} className="absolute top-full right-0 z-50 mt-2 w-64 rounded-card bg-card p-2 shadow-[0_18px_44px_rgba(32,30,29,0.18)] ring-1 ring-line/40">
          <div className="border-b border-line/30 px-3 pt-2 pb-3">
            <p className="truncate text-sm font-extrabold">{name}</p>
            {email && <p className="truncate text-xs text-muted">{email}</p>}
          </div>
          <div className="pt-1.5">
            <Link href="/learn" onClick={() => setOpen(false)} className={item}>Dashboard</Link>
            <Link href="/learn/profile" onClick={() => setOpen(false)} className={item}>Profile</Link>
            <AdminLink onClick={() => setOpen(false)} className={item} />
            <form action={signOutLearner}>
              <button type="submit" className={clsx(item, "text-red-deep")}>Log out</button>
            </form>
          </div>
      </div>
    </div>
  );
}
