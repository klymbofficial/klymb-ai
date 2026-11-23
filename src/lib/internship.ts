import { normaliseEmail } from "@/lib/email";
import { INDIA_DIAL, linkedInProblem, phoneOf, phoneProblem, type SdRole } from "@/lib/sd-offer";

/**
 * The sales internship on /internship: three months, commission only, 20% of
 * what each buyer actually pays, credited through the intern's personal link.
 * The next intake gets a new `batch`, so its applications sit apart.
 */
export const INTERNSHIP = {
  batch: "2026-12",
  startsAt: "2026-12-01T00:00:00+05:30",
  startsLabel: "1 December 2026",
  months: 3,
  commissionPct: 20,
} as const;

export const HOURS = [
  { key: "under10", label: "Under 10 hours a week" },
  { key: "10to20", label: "10 to 20 hours a week" },
  { key: "over20", label: "20+ hours a week" },
] as const;
export type Hours = (typeof HOURS)[number]["key"];

export const STATUSES = [
  { key: "applied", label: "Applied" },
  { key: "shortlisted", label: "Shortlisted" },
  { key: "accepted", label: "Accepted" },
  { key: "rejected", label: "Rejected" },
] as const;
export type InternStatus = (typeof STATUSES)[number]["key"];
export const isInternStatus = (v: unknown): v is InternStatus => STATUSES.some((s) => s.key === v);

export const INTERNSHIP_LIMITS = { name: 120, city: 80, org: 160, linkedin: 200, instagram: 80, experience: 600, why: 1200, whyMin: 20, callNote: 1000 } as const;

export interface InternshipForm {
  name: string; email: string; dial: string; phone: string; city: string; role: SdRole | ""; org: string;
  linkedin: string; instagram: string; hours: Hours | ""; experience: string; why: string;
}

/** What is still missing, as the words for "Add …". Empty when the form can be sent. */
export function internshipProblems(f: Pick<InternshipForm, "name" | "email" | "dial" | "phone" | "city" | "role" | "hours" | "why" | "linkedin">) {
  const missing: string[] = [];
  if (f.name.trim().length < 2) missing.push("your name");
  if (!normaliseEmail(f.email)) missing.push("a valid email");
  if (!phoneOf(f.dial || INDIA_DIAL, f.phone)) missing.push(phoneProblem(f.dial || INDIA_DIAL));
  if (f.city.trim().length < 2) missing.push("your city");
  if (f.role !== "student" && f.role !== "working") missing.push("student or working professional");
  if (!HOURS.some((h) => h.key === f.hours)) missing.push("how much time you can give");
  if (f.why.trim().length < INTERNSHIP_LIMITS.whyMin) missing.push("a few lines on why you want this");
  if (f.linkedin.trim() && linkedInProblem(f.linkedin)) missing.push("a LinkedIn profile link, or leave it blank");
  return missing;
}

const line = (v: unknown, max: number) => (typeof v === "string" ? v.trim().replace(/\s+/g, " ").slice(0, max) : "");
const para = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export interface InternshipRow {
  name: string; email: string; phone: string; city: string; role: SdRole; org: string | null;
  linkedin: string | null; instagram: string | null; hours: Hours; sales_experience: string | null; why: string;
}

/** A request body as a row to save, or what's missing from it. */
export function internshipApplicationOf(body: unknown): { ok: true; row: InternshipRow } | { ok: false; missing: string[] } {
  const b = (body ?? {}) as Record<string, unknown>;
  const f = {
    name: line(b.name, INTERNSHIP_LIMITS.name), email: String(b.email ?? ""), dial: String(b.dial ?? INDIA_DIAL), phone: String(b.phone ?? ""),
    city: line(b.city, INTERNSHIP_LIMITS.city),
    role: (b.role === "student" || b.role === "working" ? b.role : "") as SdRole | "",
    hours: (HOURS.some((h) => h.key === b.hours) ? b.hours : "") as Hours | "",
    why: para(b.why, INTERNSHIP_LIMITS.why), linkedin: line(b.linkedin, INTERNSHIP_LIMITS.linkedin),
  };
  const missing = internshipProblems(f);
  if (missing.length) return { ok: false, missing };
  const instagram = line(b.instagram, INTERNSHIP_LIMITS.instagram).replace(/^@/, "");
  return {
    ok: true,
    row: {
      name: f.name, email: normaliseEmail(f.email)!, phone: phoneOf(f.dial, f.phone)!, role: f.role as SdRole, hours: f.hours as Hours, why: f.why,
      city: f.city, org: line(b.org, INTERNSHIP_LIMITS.org) || null,
      linkedin: f.linkedin || null, instagram: instagram || null,
      sales_experience: para(b.experience, INTERNSHIP_LIMITS.experience) || null,
    },
  };
}

// ── Personal links and commission ───────────────────────────

/** An intern's code as typed or linked: 4 to 20 letters and digits, upper case. */
export function internCodeOf(value: unknown) {
  const code = typeof value === "string" ? value.trim().toUpperCase() : "";
  return /^[A-Z0-9]{4,20}$/.test(code) ? code : null;
}

/** A new code from their first name and two digits, e.g. ROHAN27. */
export function makeInternCode(name: string, random: () => number = Math.random) {
  const first = name.normalize("NFKD").replace(/[^A-Za-z ]/g, "").trim().split(/\s+/)[0]?.toUpperCase().slice(0, 10) ?? "";
  const base = first.length >= 2 ? first : "KLYMB";
  return `${base}${String(Math.floor(random() * 90) + 10)}`;
}

/** The share link for a code. */
export const internLink = (siteUrl: string, code: string) => `${siteUrl}/i/${code}`;

/** Commission in paise on an order worth `amountPaise` in INR (a foreign-currency order counts at its INR value): 20%, rounded to the nearest rupee (₹499 → ₹100). */
export const commissionOf = (amountPaise: number) => Math.round((amountPaise * INTERNSHIP.commissionPct) / 100 / 100) * 100;

/** "2026-12": the India-time month an order falls in. */
export function monthOf(iso: string | Date) {
  const d = new Date(new Date(iso).getTime() + 5.5 * 3600_000);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** "December 2026" for "2026-12". */
export const monthLabel = (month: string) => new Date(`${month}-01T00:00:00Z`).toLocaleDateString("en-IN", { month: "long", year: "numeric", timeZone: "UTC" });

/** How long a link's code is remembered in the buyer's browser. */
export const INTERN_KEEP_DAYS = 30;

export interface CreditedSale { intern_code: string; amount: number; status: string; created_at: string; email: string }
export interface Payout { email: string; month: string; amount: number; paid_at: string; method: string; reference: string | null }

/** One intern's numbers: sales and commission for `month`, and everything earned and paid so far. Amounts in paise. */
export function internTotals(sales: CreditedSale[], payouts: Payout[], month: string) {
  const counted = sales.filter((s) => s.status === "paid" || s.status === "refunded");
  const inMonth = counted.filter((s) => monthOf(s.created_at) === month);
  const earned = counted.reduce((t, s) => t + commissionOf(s.amount), 0);
  const paid = payouts.reduce((t, p) => t + p.amount, 0);
  return {
    monthSales: inMonth.length,
    monthRevenue: inMonth.reduce((t, s) => t + s.amount, 0),
    monthCommission: inMonth.reduce((t, s) => t + commissionOf(s.amount), 0),
    monthPaid: payouts.filter((p) => p.month.slice(0, 7) === month).reduce((t, p) => t + p.amount, 0),
    sales: counted.length,
    earned,
    paid,
    owed: Math.max(0, earned - paid),
  };
}
