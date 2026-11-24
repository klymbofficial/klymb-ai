"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * Reloads the page's data once the server's clock reaches `at` (measured
 * from the server's time when the page was made, so a wrong clock here
 * doesn't matter). Used while a timed-out test waits to be submitted.
 */
export function RefreshAt({ at, serverNow }: { at: string; serverNow: string }) {
  const router = useRouter();
  const [skew] = useState(() => new Date(serverNow).getTime() - Date.now());
  useEffect(() => {
    const wait = new Date(at).getTime() - (Date.now() + skew);
    // Already past (the server hasn't caught up yet): look again in a little while, not in a loop.
    const id = window.setTimeout(() => router.refresh(), wait > 0 ? wait : 15000);
    return () => window.clearTimeout(id);
  }, [at, skew, router]);
  return null;
}
