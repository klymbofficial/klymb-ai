import { normalisePhone, type Source } from "@/lib/sales";

/**
 * The /join interest form: someone who saw a story, a webinar or a hackathon
 * post leaves their details and becomes a sales lead. Pure, so it can be
 * tested without a database.
 */

export const STATUSES = [
  { key: "student", label: "Student" },
  { key: "working", label: "Working" },
] as const;
export type Status = (typeof STATUSES)[number]["key"];

export const YEARS = ["1st year", "2nd year", "3rd year", "4th year", "Graduated"] as const;
export const EXPERIENCE = ["Under 1 year", "1–3 years", "3–5 years", "5+ years"] as const;

export interface JoinInput {
  name?: unknown;
  phone?: unknown;
  email?: unknown;
  status?: unknown;
  org?: unknown;
  level?: unknown;
}

export interface JoinData {
  name: string;
  phone: string;
  email: string;
  status: Status;
  org: string;
  level: string;
}

export type JoinErrors = Partial<Record<keyof JoinData, string>>;

const text = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "");
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validateJoin(input: JoinInput): { ok: true; data: JoinData } | { ok: false; errors: JoinErrors } {
  const errors: JoinErrors = {};
  const name = text(input.name, 120);
  const phone = normalisePhone(text(input.phone, 30));
  const email = text(input.email, 200).toLowerCase();
  const status = STATUSES.some((s) => s.key === input.status) ? (input.status as Status) : null;
  const org = text(input.org, 120);
  const levels: readonly string[] = status === "working" ? EXPERIENCE : YEARS;
  const level = typeof input.level === "string" && levels.includes(input.level) ? input.level : "";

  if (name.length < 2) errors.name = "Tell us your name.";
  if (!phone) errors.phone = "Enter a WhatsApp number we can reach, like 98765 43210.";
  if (!EMAIL.test(email)) errors.email = "Enter an email like you@gmail.com.";
  if (!status) errors.status = "Pick one.";
  if (status && org.length < 2) errors.org = status === "working" ? "Where do you work?" : "Which college?";
  if (status && !level) errors.level = status === "working" ? "Pick your experience." : "Pick your year.";

  if (Object.keys(errors).length || !phone || !status) return { ok: false, errors };
  return { ok: true, data: { name, phone, email, status, org, level } };
}

/**
 * ?from= on the link says where the person came from: ig, webinar-21nov,
 * hackathon-dec, college-vit, ref-rohan. It sets the lead's source so the
 * report can say which story or event brought people in.
 */
export function joinSource(from: unknown): { source: Source; tag: string } {
  const tag = typeof from === "string" ? from.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 40) : "";
  const starts = (...p: string[]) => p.some((x) => tag.startsWith(x));
  const source: Source =
    starts("ig", "insta", "yt", "youtube", "linkedin", "li-", "x-", "twitter", "story", "social") ? "socials"
      : starts("webinar") ? "webinar"
        : starts("hack") ? "hackathon"
          : starts("college", "clg") ? "college"
            : starts("ref") ? "referral"
              : starts("b2b") ? "b2b"
                : "website";
  return { source, tag };
}

/** What the sales team reads on the lead: "Student · 3rd year · VIT". */
export function joinSummary(d: Pick<JoinData, "status" | "level" | "org">): string {
  return [d.status === "working" ? "Working" : "Student", d.level, d.org].filter(Boolean).join(" · ");
}

/** Where the form was filled in, for the lead's source detail. */
export function joinDetail(tag: string): string {
  return tag ? `Join form · ${tag}` : "Join form";
}
