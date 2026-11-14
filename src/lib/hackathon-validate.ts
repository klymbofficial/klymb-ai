import { safeUrl } from "@/lib/validation";

/** A team's join code: six characters, without the ones people misread (0/O, 1/I/L). */
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function makeTeamCode(random: () => number = Math.random): string {
  return Array.from({ length: 6 }, () => CODE_ALPHABET[Math.floor(random() * CODE_ALPHABET.length)]).join("");
}

/** What someone types as a code: case and spaces forgiven. Null unless it could be one. */
export function normaliseTeamCode(input: unknown): string | null {
  const code = typeof input === "string" ? input.replace(/[\s-]/g, "").toUpperCase() : "";
  return /^[A-Z0-9]{6}$/.test(code) ? code : null;
}

const text = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "");

export interface MemberDetails { name: string; phone: string; college: string; graduationYear: number }
export type DetailErrors = Partial<Record<keyof MemberDetails | "teamName" | "code", string>>;

/** A registrant's details, checked field by field. */
export function parseMemberDetails(form: FormData): { details: MemberDetails; errors: DetailErrors } {
  const errors: DetailErrors = {};
  const name = text(form.get("name"), 120);
  if (name.length < 2) errors.name = "Enter your full name.";
  const phone = text(form.get("phone"), 20).replace(/[\s()-]/g, "");
  if (!/^\+?\d{10,15}$/.test(phone)) errors.phone = "Enter a valid phone number (10–15 digits).";
  const college = text(form.get("college"), 160);
  if (college.length < 2) errors.college = "Enter your college.";
  const year = Number(text(form.get("graduationYear"), 4));
  if (!(Number.isInteger(year) && year >= 1990 && year <= 2035)) errors.graduationYear = "Enter your graduation year, like 2027.";
  return { details: { name, phone, college, graduationYear: year }, errors };
}

export interface EntryDetails { briefId: string; repoUrl: string; liveUrl: string; aiLogUrl: string; notes: string }
export type EntryErrors = Partial<Record<keyof EntryDetails, string>>;

/** A team's submission. The repo must be on GitHub; every link must be a full https:// address. */
export function parseEntry(form: FormData, briefIds: string[]): { entry: EntryDetails; errors: EntryErrors } {
  const errors: EntryErrors = {};
  const briefId = text(form.get("briefId"), 64);
  if (!briefIds.includes(briefId)) errors.briefId = "Choose the problem you built for.";
  const link = (key: "repoUrl" | "liveUrl" | "aiLogUrl", label: string) => {
    const raw = text(form.get(key), 500);
    const url = raw ? safeUrl(raw, 500) : null;
    if (!url || !url.startsWith("https://")) errors[key] = `Enter the ${label} as a full https:// link.`;
    return url ?? "";
  };
  const repoUrl = link("repoUrl", "GitHub repository");
  if (!errors.repoUrl && !/^https:\/\/(www\.)?github\.com\/[^/\s]+\/[^/\s]+/.test(repoUrl)) errors.repoUrl = "The repository must be a public GitHub repo: https://github.com/you/project.";
  const liveUrl = link("liveUrl", "live URL");
  const aiLogUrl = link("aiLogUrl", "AI-usage log");
  const notes = typeof form.get("notes") === "string" ? String(form.get("notes")).trim().slice(0, 2000) : "";
  return { entry: { briefId, repoUrl, liveUrl, aiLogUrl, notes }, errors };
}

/** A judge's mark on one criterion: a whole number from 0 to 10. */
export function parseMark(v: unknown): number | null {
  const n = Number(v);
  return Number.isInteger(n) && n >= 0 && n <= 10 ? n : null;
}
