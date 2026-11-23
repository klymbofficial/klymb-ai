import "server-only";
import { headers } from "next/headers";
import { INDIA, countryOf, marketFor, type Market } from "@/lib/pricing";

/**
 * Where a visitor pays, on the server. The country comes from Vercel's
 * geolocation header; rates come from a free public feed, cached for a day.
 * If the feed is down, anyone outside India and the US is charged INR, as
 * before, rather than not at all.
 */

/** Today's rates from 1 INR to every currency, or null when the feed can't be read. */
export async function inrRates(): Promise<Record<string, number> | null> {
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/INR", { next: { revalidate: 86400 }, signal: AbortSignal.timeout(2500) });
    const data = (await res.json()) as { result?: string; rates?: Record<string, number> };
    return data.result === "success" && data.rates ? data.rates : null;
  } catch {
    return null;
  }
}

/**
 * The visitor's country. On a local machine there is no header, so it's India
 * unless `devCountry` (from `?country=` or the claim form) says otherwise.
 */
export async function visitorCountry(devCountry?: unknown) {
  if (process.env.NODE_ENV === "development") return countryOf(devCountry) ?? "IN";
  return countryOf((await headers()).get("x-vercel-ip-country"));
}

/**
 * The market for a country kept on record, at `rates`. No country on record
 * is a claim from before we kept one, when everyone paid INR, so it stays INR.
 */
export function storedMarket(country: string | null, rates: Record<string, number> | null): Market {
  return country ? (marketFor(country, rates) ?? INDIA) : INDIA;
}

/** The market for a country, at today's rates. */
export async function marketOf(country: string | null): Promise<Market> {
  if (country === "IN") return INDIA;
  return marketFor(country, await inrRates()) ?? INDIA;
}
