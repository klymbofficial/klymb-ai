import { normaliseEmail } from "@/lib/email";
import { INDIA_DIAL, phoneOf, phoneProblem, type SdRole } from "@/lib/sd-offer";

/**
 * The live webinar on /webinar, free or paid. One at a time: the next one replaces
 * these details, and its new `slug` keeps its sign-ups apart from this one's
 * in course.webinar_registrations.
 */
export const WEBINAR = {
  slug: "system-design-us-2026-12-05",
  title: "System Design, live",
  /** The second half of the page heading. */
  tagline: "the skill AI doesn't replace.",
  startsAt: "2026-12-05T09:00:00-06:00",
  endsAt: "2026-12-05T10:00:00-06:00",
  /** The time zone the labels are in, for "Today" and "Tomorrow". */
  timeZone: "America/Chicago",
  /** As the page and the email say it. */
  dateLabel: "Saturday, 5 December 2026",
  timeLabel: "9:00 to 10:00 AM CST",
  /** The same start on the other US coasts. */
  otherZones: "10:00 AM ET · 7:00 AM PT",
  /** Short forms, for the strip, the sticky bar and the ticket. */
  shortDate: "Sat 5 Dec",
  startLabel: "9:00 AM CST",
  /** "Join 5 minutes early, around …" in the email on the day. */
  earlyLabel: "8:55 AM CST",
  ticketDate: "Dec 5, 2026",
  /**
   * The seat price, charged by Razorpay before the seat is confirmed, in the
   * currency's smallest unit. Null makes the webinar free again.
   */
  price: { amount: 100, currency: "USD", label: "$1" } as WebinarPrice | null,
  /** The country code the WhatsApp field starts on. */
  defaultDial: "1",
  speaker: "Klymb.ai team",
  whatsappGroup: "https://chat.whatsapp.com/FDCM4Q6KcAK9bHqs5eOM2g?s=cl&p=a&iam=2",
  /** The Google Meet room, emailed on the day from /admin/webinars. */
  meetUrl: "https://meet.google.com/frw-hmoe-vvg",
  agenda: [
    ["AI and your job", "Which jobs AI is shrinking, which ones it's creating, and why system design matters more now."],
    ["The building blocks", "Load balancers, caching, databases, queues and the quick maths behind every design, explained simply."],
    ["Design 1: a URL shortener", "We design it live, step by step, the way a real interview round runs."],
    ["Design 2: a chat app like WhatsApp", "How messages arrive instantly, how the ticks work, and what happens when a phone goes offline."],
    ["Why we started Klymb.ai", "The gap we kept seeing between college, courses and real jobs, and what we built for it."],
    ["Live Q&A", "Bring your questions about system design, interviews and careers."],
  ],
} as const;

export interface WebinarPrice { amount: number; currency: string; label: string }

/** "Free" or "$1", as the page and the ticket say it. */
export const webinarFee = () => WEBINAR.price?.label ?? "Free";

export const webinarStart = () => new Date(WEBINAR.startsAt).getTime();
export const webinarEnd = () => new Date(WEBINAR.endsAt).getTime();

/** Registration stays open until the webinar ends; latecomers can still join the group. */
export const webinarOpen = (now: number = Date.now()) => now < webinarEnd();

/** The time now and whether sign-up is open, read once so the page and its countdown agree. */
export function webinarClock() {
  const now = Date.now();
  return { now, open: webinarOpen(now) };
}

/** Where the clock stands against the webinar: before it, during it, or after it. */
export type WebinarPhase = "before" | "live" | "over";

/** The countdown to the start, split into days, hours, minutes and seconds, and the phase it is in. */
export function webinarCountdown(now: number = Date.now()) {
  const left = Math.max(0, webinarStart() - now);
  const phase: WebinarPhase = now < webinarStart() ? "before" : now < webinarEnd() ? "live" : "over";
  return {
    phase,
    days: Math.floor(left / 864e5),
    hours: Math.floor(left / 36e5) % 24,
    minutes: Math.floor(left / 6e4) % 60,
    seconds: Math.floor(left / 1e3) % 60,
  };
}

/** "Today", "Tomorrow" or nothing, by the calendar day where the webinar's time is given, for the line above the countdown. */
export function webinarDayWord(now: number = Date.now()): "Today" | "Tomorrow" | "" {
  const day = (t: number) => Date.parse(new Intl.DateTimeFormat("en-CA", { timeZone: WEBINAR.timeZone }).format(t));
  const days = Math.round((day(webinarStart()) - day(now)) / 864e5);
  return days === 0 ? "Today" : days === 1 ? "Tomorrow" : "";
}

/** "20261121T133000Z": a time the way calendar links want it. */
const calendarTime = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

/** Opens Google Calendar with the webinar filled in. */
export function googleCalendarLink() {
  const p = new URLSearchParams({
    action: "TEMPLATE",
    text: `Klymb.ai live webinar: ${WEBINAR.title}`,
    dates: `${calendarTime(WEBINAR.startsAt)}/${calendarTime(WEBINAR.endsAt)}`,
    details: `${WEBINAR.price ? "A" : "A free"} 1-hour live webinar. The Google Meet link is shared on WhatsApp and by email on the day. WhatsApp group: ${WEBINAR.whatsappGroup}`,
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
