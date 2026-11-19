"use client";

import { useEffect } from "react";
import { INTERN_KEEP_DAYS, internCodeOf } from "@/lib/internship";

const KEY = "klymb.intern";

/**
 * Keeps the code from an intern's link in this browser for 30 days, so a buyer
 * who comes back later without the link still counts for that intern. A newer
 * link replaces an older one. `live` is the code the server accepted on this page.
 */
export function RememberIntern({ live }: { live: string | null }) {
  useEffect(() => {
    if (!live) return;
    try { window.localStorage.setItem(KEY, JSON.stringify({ code: live, at: Date.now() })); } catch { /* private mode: only the link itself counts */ }
  }, [live]);
  return null;
}

/** The intern code this browser came with, if it's still within its 30 days. */
export function keptIntern(): string | null {
  try {
    const v = JSON.parse(window.localStorage.getItem(KEY) ?? "null") as { code?: unknown; at?: unknown } | null;
    if (!v || typeof v.at !== "number" || Date.now() - v.at > INTERN_KEEP_DAYS * 864e5) return null;
    return internCodeOf(v.code);
  } catch {
    return null;
  }
}
