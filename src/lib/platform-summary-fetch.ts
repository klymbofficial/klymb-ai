import "server-only";
import { cache } from "react";
import { parsePlatformSummary, type PlatformSummary } from "@/lib/platform-summary";

/** app.klymb.ai's address; a staging copy can be pointed at with PLATFORM_URL. */
const PLATFORM_URL = process.env.PLATFORM_URL ?? "https://app.klymb.ai";

/** A slow platform must never hold up the dashboard: past this, it renders without. */
const TIMEOUT_MS = 2500;

/**
 * This person's summary from app.klymb.ai (contract in platform-summary.ts),
 * or null: when KLYMB_SUMMARY_SECRET isn't set, the endpoint isn't there yet,
 * it is slow, or it answers with anything unexpected. The dashboard then shows
 * the programs without progress, as before.
 */
export const platformSummary = cache(async (email: string): Promise<PlatformSummary | null> => {
  const secret = process.env.KLYMB_SUMMARY_SECRET;
  if (!secret) return null;
  try {
    const res = await fetch(`${PLATFORM_URL}/api/internal/klymb-summary`, {
      method: "POST",
      headers: { authorization: `Bearer ${secret}`, "content-type": "application/json" },
      body: JSON.stringify({ email }),
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) {
      console.warn("platform summary unavailable:", res.status);
      return null;
    }
    return parsePlatformSummary(await res.json());
  } catch (e) {
    console.warn("platform summary failed:", e instanceof Error ? e.name : "error");
    return null;
  }
});
