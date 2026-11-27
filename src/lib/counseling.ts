import { normalisePhone } from "@/lib/sales";

/**
 * The /counseling booking: an IT fresher picks a preferred evening slot for a
 * free one-on-one career call and becomes a B2C sales lead. The slot is a
 * preference, not a reservation: the team reaches out to confirm it. Pure, so
 * it can be tested without a database, and shared by the form and the server.
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

/** Evening slots, IST, as the hour each one starts: 5, 6, 7 and 8 PM (the last ends at 9). */
export const SLOT_HOURS = [17, 18, 19, 20] as const;

/** How many days ahead can be picked, starting tomorrow. */
export const SLOT_DAYS = 7;

/** Today's date in India, YYYY-MM-DD. */
export function indiaToday(now: Date = new Date()): string {
  return new Date(now.getTime() + 5.5 * 3600_000).toISOString().slice(0, 10);
}

/** The days that can be picked: the SLOT_DAYS after `today`, as YYYY-MM-DD. */
export function slotDays(today: string): string[] {
  const start = Date.parse(`${today}T00:00:00Z`);
  return Array.from({ length: SLOT_DAYS }, (_, n) => new Date(start + (n + 1) * 86_400_000).toISOString().slice(0, 10));
}

/** "Mon" and "30 Nov" for a YYYY-MM-DD day. */
export function dayParts(day: string): { weekday: string; date: string } {
  const d = new Date(`${day}T00:00:00Z`);
  return {
    weekday: d.toLocaleDateString("en-IN", { weekday: "short", timeZone: "UTC" }),
    date: d.toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" }),
  };
}

/** 17 → "5 PM". */
export const hourLabel = (h: number) => `${h > 12 ? h - 12 : h} ${h >= 12 ? "PM" : "AM"}`;

/** "Mon 30 Nov, 6 PM". */
export function slotLabel(day: string, hour: number): string {
  const { weekday, date } = dayParts(day);
  return `${weekday} ${date}, ${hourLabel(hour)}`;
}

export interface CounselingInput {
  day?: unknown;
  hour?: unknown;
  name?: unknown;
  phone?: unknown;
  email?: unknown;
  college?: unknown;
  year?: unknown;
  role?: unknown;
  question?: unknown;
}

export interface CounselingRequest {
  day: string;
  hour: (typeof SLOT_HOURS)[number];
  name: string;
  phone: string;
  email: string;
  college: string;
  year: (typeof PASSING_YEARS)[number];
  role: (typeof ROLES)[number];
  question: string;
}

export type CounselingErrors = Partial<Record<keyof CounselingRequest, string>>;

const text = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "");
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const oneOf = <T extends readonly string[]>(list: T, v: string): v is T[number] => (list as readonly string[]).includes(v);
const isHour = (v: number): v is (typeof SLOT_HOURS)[number] => (SLOT_HOURS as readonly number[]).includes(v);

export function validateCounseling(input: CounselingInput, today: string): { ok: true; data: CounselingRequest } | { ok: false; errors: CounselingErrors } {
  const errors: CounselingErrors = {};
  const day = text(input.day, 10);
  const hour = Number(input.hour);
  const name = text(input.name, 120);
  const phone = normalisePhone(text(input.phone, 30));
  const email = text(input.email, 200).toLowerCase();
  const college = text(input.college, 120);
  const year = text(input.year, 10);
  const role = text(input.role, 40);
  const question = text(input.question, 600);

  if (!slotDays(today).includes(day)) errors.day = "Pick a day again.";
  if (!isHour(hour)) errors.hour = "Pick a time.";
  if (name.length < 2) errors.name = "Tell us your name.";
  if (!phone) errors.phone = "Enter your WhatsApp number, like 98765 43210.";
  if (!EMAIL.test(email)) errors.email = "Enter an email like you@gmail.com.";
  if (college.length < 2) errors.college = "Which college did you study at?";
  if (!oneOf(PASSING_YEARS, year)) errors.year = "Pick your passing year.";
  if (!oneOf(ROLES, role)) errors.role = "Pick the line you want to get into.";

  if (Object.keys(errors).length || !phone || !isHour(hour) || !oneOf(PASSING_YEARS, year) || !oneOf(ROLES, role)) return { ok: false, errors };
  return { ok: true, data: { day, hour, name, phone, email, college, year, role, question } };
}

/** The line added to the lead's notes in Sales. */
export function counselingNote(d: CounselingRequest, today: string): string {
  const ask = d.question ? ` · Wants to ask: ${d.question}` : "";
  return `Free counseling request · prefers ${slotLabel(d.day, d.hour)} IST · ${d.role} · passed out ${d.year} · ${today}${ask}`;
}
