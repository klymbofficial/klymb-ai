import { normaliseEmail } from "@/lib/email";
import { INDIA_DIAL, phoneOf, phoneProblem, type SdRole } from "@/lib/sd-offer";

/**
 * The free live webinar on /webinar. One at a time: the next one replaces
 * these details, and its new `slug` keeps its sign-ups apart from this one's
 * in course.webinar_registrations.
 */
export const WEBINAR = {
  slug: "ai-tools-claude-2026-11",
  title: "AI Tools and Claude",
  startsAt: "2026-11-21T19:00:00+05:30",
  endsAt: "2026-11-21T20:00:00+05:30",
  /** As the page and the email say it. */
  dateLabel: "Saturday, 21 November 2026",
  timeLabel: "7:00 to 8:00 PM IST",
  speaker: "Klymb.ai team",
  whatsappGroup: "https://chat.whatsapp.com/FDCM4Q6KcAK9bHqs5eOM2g?s=cl&p=a&iam=2",
  agenda: [
    ["Getting job-ready in the AI era", "What hiring looks like now that AI does part of the work, and the skills that still get people hired."],
    ["Klymb.ai's courses", "What each course teaches, who it's for, and how the daily, hands-on format works."],
    ["Why we started Klymb.ai", "The gap we kept seeing between college, courses and real jobs, and what we're doing about it."],
    ["Live Q&A", "Bring your questions about careers, AI and our courses. We answer as many as the hour allows."],
    ["Upcoming workshops and webinars", "What's coming next, and how to get a seat."],
  ],
} as const;

export const webinarStart = () => new Date(WEBINAR.startsAt).getTime();
export const webinarEnd = () => new Date(WEBINAR.endsAt).getTime();

/** Registration stays open until the webinar ends; latecomers can still join the group. */
export const webinarOpen = (now: number = Date.now()) => now < webinarEnd();

/** The time now and whether sign-up is open, read once so the page and its countdown agree. */
export function webinarClock() {
  const now = Date.now();
  return { now, open: webinarOpen(now) };
}

/** "20261121T133000Z": a time the way calendar links want it. */
const calendarTime = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

/** Opens Google Calendar with the webinar filled in. */
export function googleCalendarLink() {
  const p = new URLSearchParams({
    action: "TEMPLATE",
    text: `Klymb.ai live webinar: ${WEBINAR.title}`,
    dates: `${calendarTime(WEBINAR.startsAt)}/${calendarTime(WEBINAR.endsAt)}`,
    details: `Free 1-hour live webinar. The Google Meet link is shared on WhatsApp and by email on the day. WhatsApp group: ${WEBINAR.whatsappGroup}`,
  });
  return `https://calendar.google.com/calendar/render?${p}`;
}

export interface WebinarForm { name: string; email: string; dial: string; phone: string; role: SdRole | ""; org: string; question: string }

export const WEBINAR_LIMITS = { name: 120, org: 120, question: 500 } as const;

/** What is still missing, as the words for "Add …". Empty when the form can be sent. */
export function webinarProblems(f: Pick<WebinarForm, "name" | "email" | "dial" | "phone" | "role">) {
  const missing: string[] = [];
  if (f.name.trim().length < 2) missing.push("your name");
  if (!normaliseEmail(f.email)) missing.push("a valid email");
  if (!phoneOf(f.dial || INDIA_DIAL, f.phone)) missing.push(phoneProblem(f.dial || INDIA_DIAL));
  if (f.role !== "student" && f.role !== "working") missing.push("student or working professional");
  return missing;
}

const text = (v: unknown, max: number) => (typeof v === "string" ? v.trim().replace(/\s+/g, " ").slice(0, max) : "");

/** A request body as a row to save, or the problems with it. */
export function webinarRegistrationOf(body: unknown):
  | { ok: true; row: { name: string; email: string; phone: string; role: SdRole; org: string | null; question: string | null } }
  | { ok: false; missing: string[] } {
  const b = (body ?? {}) as Record<string, unknown>;
  const form = { name: text(b.name, WEBINAR_LIMITS.name), email: String(b.email ?? ""), dial: String(b.dial ?? INDIA_DIAL), phone: String(b.phone ?? ""), role: (b.role === "student" || b.role === "working" ? b.role : "") as SdRole | "" };
  const missing = webinarProblems(form);
  if (missing.length) return { ok: false, missing };
  const org = text(b.org, WEBINAR_LIMITS.org);
  const question = typeof b.question === "string" ? b.question.trim().slice(0, WEBINAR_LIMITS.question) : "";
  return {
    ok: true,
    row: { name: form.name, email: normaliseEmail(form.email)!, phone: phoneOf(form.dial, form.phone)!, role: form.role as SdRole, org: org || null, question: question || null },
  };
}
