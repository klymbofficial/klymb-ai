/**
 * A rough local-currency figure for visitors outside India. Orders are always
 * charged in INR by Razorpay; their bank converts it, so this is only a guide.
 * Rates come from a free public feed, cached for a day; if it's down, no
 * estimate is shown.
 */

/** Countries we're likely to see, by their ISO code, and the currency they pay in. */
const CURRENCY: Record<string, string> = {
  PK: "PKR", BD: "BDT", NP: "NPR", LK: "LKR", AE: "AED", SA: "SAR", QA: "QAR", KW: "KWD", OM: "OMR", BH: "BHD",
  US: "USD", CA: "CAD", GB: "GBP", AU: "AUD", NZ: "NZD", SG: "SGD", MY: "MYR", ID: "IDR", PH: "PHP", TH: "THB",
  JP: "JPY", ZA: "ZAR", NG: "NGN", KE: "KES", EG: "EGP", CH: "CHF", SE: "SEK", NO: "NOK", DK: "DKK", PL: "PLN",
  DE: "EUR", FR: "EUR", IT: "EUR", ES: "EUR", NL: "EUR", IE: "EUR", BE: "EUR", AT: "EUR", PT: "EUR", FI: "EUR", GR: "EUR",
};

export interface LocalRate { currency: string; rate: number }

/** The visitor's currency, if they're outside India and we know it. */
export const currencyOf = (country: string | null | undefined) =>
  country && country.toUpperCase() !== "IN" ? CURRENCY[country.toUpperCase()] ?? null : null;

/** "≈ PKR 6,712" style text for an INR amount, rounded so it doesn't look exact. */
export function localEstimate(inr: number, local: LocalRate) {
  const raw = inr * local.rate;
  const step = raw >= 1000 ? 10 : raw >= 100 ? 1 : 0.5;
  const value = Math.round(raw / step) * step;
  const text = new Intl.NumberFormat("en", { style: "currency", currency: local.currency, currencyDisplay: "code", minimumFractionDigits: 0, maximumFractionDigits: step < 1 ? 2 : 0 }).format(value);
  return `≈ ${text.replace(/ /g, " ")}`;
}

/** Today's rate from 1 INR to their currency, or null when we can't tell. */
export async function localRate(country: string | null | undefined): Promise<LocalRate | null> {
  const currency = currencyOf(country);
  if (!currency) return null;
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/INR", { next: { revalidate: 86400 }, signal: AbortSignal.timeout(2500) });
    const data = (await res.json()) as { result?: string; rates?: Record<string, number> };
    const rate = data.result === "success" ? data.rates?.[currency] : undefined;
    return typeof rate === "number" && rate > 0 ? { currency, rate } : null;
  } catch {
    return null;
  }
}
