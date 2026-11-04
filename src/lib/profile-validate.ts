import { normaliseGithubUsername, normaliseLinkedinSlug } from "@/lib/learner/evidence";
import { safeUrl } from "@/lib/validation";
import type { Profile } from "@/lib/profile-score";

export type ProfileErrors = Partial<Record<keyof Profile, string>>;

const text = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "");

/**
 * Rebuilds a profile from a submitted form, field by field. Every field is
 * optional (the score asks for what is missing); a field that is filled in
 * must be valid.
 */
export function parseProfile(form: FormData): { profile: Profile; errors: ProfileErrors } {
  const errors: ProfileErrors = {};
  const phoneRaw = text(form.get("phone"), 20).replace(/[\s()-]/g, "");
  if (phoneRaw && !/^\+?\d{10,15}$/.test(phoneRaw)) errors.phone = "Enter a valid phone number (10–15 digits).";

  const yearRaw = text(form.get("graduationYear"), 4);
  const year = yearRaw ? Number(yearRaw) : null;
  if (yearRaw && !(Number.isInteger(year) && year! >= 1970 && year! <= 2040)) errors.graduationYear = "Enter a year like 2026.";

  const githubRaw = text(form.get("githubUsername"), 200);
  const github = githubRaw ? normaliseGithubUsername(githubRaw) : "";
  if (github === null) errors.githubUsername = "Paste https://github.com/your-username, or just the username.";

  const linkedinRaw = text(form.get("linkedinSlug"), 300);
  const linkedin = linkedinRaw ? normaliseLinkedinSlug(linkedinRaw) : "";
  if (linkedin === null) errors.linkedinSlug = "Paste https://www.linkedin.com/in/yourname.";

  const portfolioRaw = text(form.get("portfolioUrl"), 500);
  const portfolio = portfolioRaw ? safeUrl(portfolioRaw, 500) : "";
  if (portfolio === null) errors.portfolioUrl = "Enter a full link starting with https://.";

  const status = form.get("status");
  const skills = [...new Map(
    text(form.get("skills"), 600).split(",").map((s) => s.trim().slice(0, 40)).filter(Boolean).map((s) => [s.toLowerCase(), s] as const),
  ).values()].slice(0, 20);

  return {
    errors,
    profile: {
      name: text(form.get("name"), 120),
      headline: text(form.get("headline"), 120),
      phone: errors.phone ? "" : phoneRaw,
      city: text(form.get("city"), 80),
      status: status === "student" || status === "working" ? status : "",
      institution: text(form.get("institution"), 160),
      degree: text(form.get("degree"), 120),
      graduationYear: errors.graduationYear ? null : year,
      noExperience: form.get("noExperience") === "on",
      jobRole: text(form.get("jobRole"), 120),
      company: text(form.get("company"), 120),
      skills,
      githubUsername: github ?? "",
      linkedinSlug: linkedin ?? "",
      portfolioUrl: portfolio ?? "",
    },
  };
}
