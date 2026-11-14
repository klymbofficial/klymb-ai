import { normaliseEmail } from "@/lib/email";

/**
 * The rules for the Companies page in Klymb admin, kept free of the
 * database and of Next so they can be tested. Every value from the form is
 * checked here before it is saved; the database checks the same shapes again.
 */

/** Slugs a company may not take, because a page already lives there. */
export const RESERVED_SLUGS = ["sign-in"] as const;
export const MAX_SEATS = 100_000;

export type Checked<T> = { ok: true; value: T } | { ok: false; message: string };

export function companyName(input: unknown): Checked<string> {
  const value = typeof input === "string" ? input.trim().replace(/\s+/g, " ") : "";
  if (!value) return { ok: false, message: "Enter the company's name." };
  if (value.length > 120) return { ok: false, message: "Keep the name under 120 characters." };
  return { ok: true, value };
}

/** A starting slug from the name: "Acme India Pvt. Ltd." → "acme-india-pvt-ltd". */
export function slugFromName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\x00-\x7f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/, "");
}

/** The URL name, klymb.ai/org/<slug>. Same shape the database enforces. */
export function companySlug(input: unknown): Checked<string> {
  const value = typeof input === "string" ? input.trim().toLowerCase() : "";
  if (!value) return { ok: false, message: "Enter a URL name." };
  if (value.length > 60 || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(value)) {
    return { ok: false, message: "Use lowercase letters, numbers and single dashes, up to 60 characters." };
  }
  if ((RESERVED_SLUGS as readonly string[]).includes(value)) return { ok: false, message: `"${value}" is taken by a Klymb page. Pick another.` };
  return { ok: true, value };
}

/** "#83050B", "83050b" or "#83050b" → "#83050b". Empty means Klymb's own color (null). */
export function brandColor(input: unknown): Checked<string | null> {
  const raw = typeof input === "string" ? input.trim().toLowerCase() : "";
  if (!raw) return { ok: true, value: null };
  const value = raw.startsWith("#") ? raw : `#${raw}`;
  if (!/^#[0-9a-f]{6}$/.test(value)) return { ok: false, message: "Use a 6-digit hex color, like #83050b." };
  return { ok: true, value };
}

/** An https link to an image. Empty means no logo (null). */
export function logoUrl(input: unknown): Checked<string | null> {
  const raw = typeof input === "string" ? input.trim() : "";
  if (!raw) return { ok: true, value: null };
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return { ok: false, message: "That isn't a valid link." };
  }
  if (url.protocol !== "https:") return { ok: false, message: "The logo link must start with https://." };
  // A link carrying a username or password would put a secret on every page.
  if (url.username || url.password) return { ok: false, message: "The logo link can't contain a username or password." };
  const value = url.toString();
  if (value.length > 2000) return { ok: false, message: "That link is too long." };
  return { ok: true, value };
}

/** Whole seats, never fewer than the people already in the company. */
export function seatCount(input: unknown, members: number): Checked<number> {
  const raw = typeof input === "number" ? String(input) : typeof input === "string" ? input.trim() : "";
  if (!/^\d+$/.test(raw)) return { ok: false, message: "Seats must be a whole number." };
  const value = Number(raw);
  if (value > MAX_SEATS) return { ok: false, message: `Seats can't be more than ${MAX_SEATS.toLocaleString("en-IN")}.` };
  if (value < members) {
    return { ok: false, message: `The company already has ${members} ${members === 1 ? "person" : "people"}, so it needs at least ${members} seats.` };
  }
  return { ok: true, value };
}

export interface HrCheck {
  seatCount: number;
  members: number;
  hasHr: boolean;
  isLearner: boolean;
  /** The slug of the company this email already belongs to, if any. */
  memberOf: string | null;
}

/** Why the first HR person can't be added, or null when they can. */
export function firstHrBlocked(c: HrCheck): string | null {
  if (c.hasHr) return "This company already has an HR person. More people are added by HR, not here.";
  if (c.memberOf) return `That email already belongs to a company (${c.memberOf}). A person can only be in one.`;
  if (c.isLearner) return "That email is a Klymb learner. Company members need a different email.";
  if (c.members >= c.seatCount) return "There's no free seat. Raise the seat count first.";
  return null;
}

export function hrEmail(input: unknown): Checked<string> {
  const value = normaliseEmail(input);
  return value ? { ok: true, value } : { ok: false, message: "Enter a valid email for the HR person." };
}

export function personName(input: unknown): string | null {
  const value = typeof input === "string" ? input.trim().replace(/\s+/g, " ").slice(0, 80) : "";
  return value || null;
}
