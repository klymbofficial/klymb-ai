/**
 * What the Settings page accepts (0098). Pure, so it is tested directly and
 * the same rules guard the form and the server action. Each reader returns
 * either the tidy values to save or the first problem, by field.
 */

export const LANGUAGES = [{ code: "en", label: "English" }, { code: "hi", label: "Hindi" }] as const;
export type Language = (typeof LANGUAGES)[number]["code"];

// Some runtimes still list a few zones by their old names; show the names people know.
const CURRENT_NAME: Record<string, string> = { "Asia/Calcutta": "Asia/Kolkata", "Asia/Saigon": "Asia/Ho_Chi_Minh", "Asia/Katmandu": "Asia/Kathmandu", "Asia/Rangoon": "Asia/Yangon", "Europe/Kiev": "Europe/Kyiv" };

/** Every timezone the runtime knows (always including `keep`, the saved one), falling back to a short list where it can't say. */
export function timeZones(keep?: string): string[] {
  let all: string[] = ["Asia/Kolkata", "Asia/Dubai", "Asia/Singapore", "Europe/London", "America/New_York"];
  try {
    const listed = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf?.("timeZone");
    if (listed?.length) all = listed.map((z) => CURRENT_NAME[z] ?? z);
  } catch { /* older runtime */ }
  const set = new Set(["UTC", ...all, ...(keep ? [keep] : [])]);
  return [...set].sort((a, b) => (a === "UTC" ? -1 : b === "UTC" ? 1 : a.localeCompare(b)));
}

/** "Asia/Kolkata (GMT+05:30)", as in the screenshot. */
export function zoneLabel(zone: string, at = new Date()): string {
  try {
    const part = new Intl.DateTimeFormat("en-US", { timeZone: zone, timeZoneName: "longOffset" }).formatToParts(at).find((p) => p.type === "timeZoneName");
    const offset = part?.value === "GMT" ? "GMT+00:00" : part?.value;
    return offset ? `${zone} (${offset})` : zone;
  } catch {
    return zone;
  }
}

const isZone = (z: string) => { try { new Intl.DateTimeFormat("en-US", { timeZone: z }); return true; } catch { return false; } };

const text = (v: unknown) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim() : "");
const PHONE = /^\+?[0-9 ()-]{6,24}$/;

export type Problem<F extends string> = { ok: false; field: F; message: string };

export interface Profile {
  name: string;
  jobTitle: string | null;
  phone: string | null;
  timeZone: string;
  language: Language;
}

export function readProfile(raw: Record<string, unknown>): { ok: true; value: Profile } | Problem<keyof Profile> {
  const name = text(raw.name);
  if (!name) return { ok: false, field: "name", message: "Enter your full name." };
  if (name.length > 80) return { ok: false, field: "name", message: "Keep your name to 80 characters." };
  const jobTitle = text(raw.jobTitle) || null;
  if (jobTitle && jobTitle.length > 80) return { ok: false, field: "jobTitle", message: "Keep the job title to 80 characters." };
  const phone = text(raw.phone) || null;
  if (phone && !PHONE.test(phone)) return { ok: false, field: "phone", message: "Enter a phone number with digits only, for example +91 98765 43210." };
  const timeZone = text(raw.timeZone);
  if (!timeZone || timeZone.length > 64 || !isZone(timeZone)) return { ok: false, field: "timeZone", message: "Choose a timezone from the list." };
  const language = LANGUAGES.find((l) => l.code === raw.language)?.code;
  if (!language) return { ok: false, field: "language", message: "Choose a language from the list." };
  return { ok: true, value: { name, jobTitle, phone, timeZone, language } };
}

export interface CompanyDetails {
  phone: string | null;
  website: string | null;
  address: string | null;
}

export function readCompanyDetails(raw: Record<string, unknown>): { ok: true; value: CompanyDetails } | Problem<keyof CompanyDetails> {
  const phone = text(raw.phone) || null;
  if (phone && !PHONE.test(phone)) return { ok: false, field: "phone", message: "Enter a phone number with digits only, for example +91 22 4000 1234." };
  let website = text(raw.website) || null;
  if (website) {
    if (!/^https?:\/\//i.test(website)) website = `https://${website}`;
    try {
      const u = new URL(website);
      if (!u.hostname.includes(".") || website.length > 200) throw new Error("bad");
      website = u.toString();
    } catch {
      return { ok: false, field: "website", message: "Enter the website's address, for example https://www.example.com." };
    }
  }
  // Keep line breaks in the address; tidy each line.
  const address = typeof raw.address === "string" ? raw.address.split("\n").map((l) => l.replace(/\s+/g, " ").trim()).filter(Boolean).join("\n") || null : null;
  if (address && address.length > 500) return { ok: false, field: "address", message: "Keep the address to 500 characters." };
  return { ok: true, value: { phone, website, address } };
}

/** The company switches. The first two are saved only for now (their pages say so); AI review suggestions (0101) act at once. */
export const COMPANY_SWITCHES = ["hide_candidate_names", "eeo_survey", "ai_review_suggestions"] as const;
export type CompanySwitch = (typeof COMPANY_SWITCHES)[number];
export const isCompanySwitch = (v: unknown): v is CompanySwitch => (COMPANY_SWITCHES as readonly unknown[]).includes(v);

/**
 * "Log out from other sessions": a company session is refused when it signed
 * in before the cut-off, unless it is the session that pressed the button.
 * A session from before sign-in times were recorded counts as signed in at 0.
 */
export function sessionAllowed(cutoff: { before: Date; keepSid: string | null } | null, session: { sid?: string; authAt?: number }): boolean {
  if (!cutoff) return true;
  if (cutoff.keepSid && session.sid === cutoff.keepSid) return true;
  return (session.authAt ?? 0) > cutoff.before.getTime();
}
