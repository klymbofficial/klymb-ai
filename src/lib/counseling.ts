import { normalisePhone } from "@/lib/sales";

/**
 * The /counseling form: an IT fresher asks for a free one-on-one career talk
 * and becomes a B2C sales lead. Pure, so it can be tested without a database.
 */

export const PASSING_YEARS = ["2024", "2025", "2026", "2027"] as const;

export const ROLES = [
  "Software developer",
  "Frontend / web",
  "Backend",
  "Full stack",
  "Data / analytics",
  "AI / ML",
  "Testing / QA",
  "Cloud / DevOps",
  "Not sure yet",
] as const;

export interface CounselingInput {
  name?: unknown;
  phone?: unknown;
  email?: unknown;
  college?: unknown;
  year?: unknown;
  role?: unknown;
  question?: unknown;
}

export interface CounselingRequest {
  name: string;
  phone: string;
  role: (typeof ROLES)[number];
  /** Optional: empty when not given. */
  email: string;
  college: string;
  year: (typeof PASSING_YEARS)[number] | "";
  question: string;
}

export type CounselingErrors = Partial<Record<keyof CounselingRequest, string>>;

const text = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "");
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const oneOf = <T extends readonly string[]>(list: T, v: string): v is T[number] => (list as readonly string[]).includes(v);

/**
 * Only name, WhatsApp number and career interest are required, so the free
 * call doesn't feel like an application. Email, college and passing year are
 * optional, but checked when given.
 */
export function validateCounseling(input: CounselingInput): { ok: true; data: CounselingRequest } | { ok: false; errors: CounselingErrors } {
  const errors: CounselingErrors = {};
  const name = text(input.name, 120);
  const phone = normalisePhone(text(input.phone, 30));
  const role = text(input.role, 40);
  const email = text(input.email, 200).toLowerCase();
  const college = text(input.college, 120);
  const year = text(input.year, 10);
  const question = text(input.question, 600);

  if (name.length < 2) errors.name = "Tell us your name.";
  if (!phone) errors.phone = "Enter your WhatsApp number, like 98765 43210.";
  if (!oneOf(ROLES, role)) errors.role = "Pick your career interest.";
  if (email && !EMAIL.test(email)) errors.email = "Check the email, like you@gmail.com.";
  if (year && !oneOf(PASSING_YEARS, year)) errors.year = "Pick a year from the list.";

  if (Object.keys(errors).length || !phone || !oneOf(ROLES, role) || (year && !oneOf(PASSING_YEARS, year))) return { ok: false, errors };
  return { ok: true, data: { name, phone, role, email, college, year: year as CounselingRequest["year"], question } };
}

/** The line added to the lead's notes in Sales. */
export function counselingNote(d: CounselingRequest, today: string): string {
  const ask = d.question ? ` · Wants to ask: ${d.question}` : "";
  const year = d.year ? ` · passed out ${d.year}` : "";
  return `Free counseling request · ${d.role}${year} · ${today}${ask}`;
}
