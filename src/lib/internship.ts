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
export function internshipProblems(f: Pick<InternshipForm, "name" | "email" | "dial" | "phone" | "role" | "hours" | "why" | "linkedin">) {
  const missing: string[] = [];
  if (f.name.trim().length < 2) missing.push("your name");
  if (!normaliseEmail(f.email)) missing.push("a valid email");
  if (!phoneOf(f.dial || INDIA_DIAL, f.phone)) missing.push(phoneProblem(f.dial || INDIA_DIAL));
  if (f.role !== "student" && f.role !== "working") missing.push("student or working professional");
  if (!HOURS.some((h) => h.key === f.hours)) missing.push("how much time you can give");
  if (f.why.trim().length < INTERNSHIP_LIMITS.whyMin) missing.push("a few lines on why you want this");
  if (f.linkedin.trim() && linkedInProblem(f.linkedin)) missing.push("a LinkedIn profile link, or leave it blank");
  return missing;
}

const line = (v: unknown, max: number) => (typeof v === "string" ? v.trim().replace(/\s+/g, " ").slice(0, max) : "");
const para = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export interface InternshipRow {
  name: string; email: string; phone: string; city: string | null; role: SdRole; org: string | null;
  linkedin: string | null; instagram: string | null; hours: Hours; sales_experience: string | null; why: string;
}

/** A request body as a row to save, or what's missing from it. */
export function internshipApplicationOf(body: unknown): { ok: true; row: InternshipRow } | { ok: false; missing: string[] } {
  const b = (body ?? {}) as Record<string, unknown>;
  const f = {
    name: line(b.name, INTERNSHIP_LIMITS.name), email: String(b.email ?? ""), dial: String(b.dial ?? INDIA_DIAL), phone: String(b.phone ?? ""),
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
      city: line(b.city, INTERNSHIP_LIMITS.city) || null, org: line(b.org, INTERNSHIP_LIMITS.org) || null,
      linkedin: f.linkedin || null, instagram: instagram || null,
      sales_experience: para(b.experience, INTERNSHIP_LIMITS.experience) || null,
    },
  };
}
