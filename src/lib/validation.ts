import { normaliseEmail } from "@/lib/email";
import { experienceOptions, roleOptions } from "@/data/program";
import { trackSlugs } from "@/data/tracks";
import type { TrackSlug } from "@/types/program";

export interface RegistrationData {
  name: string;
  email: string;
  phone: string;
  track: TrackSlug | "";
  currentRole: string;
  experience: string;
  linkedin: string;
  github: string;
  consent: boolean;
}

export type RegistrationErrors = Partial<Record<keyof RegistrationData, string>>;

export const emptyRegistration: RegistrationData = {
  name: "", email: "", phone: "", track: "", currentRole: "", experience: "", linkedin: "", github: "", consent: false,
};

/** Server-side ceilings. The form cannot be trusted to enforce any of them. */
export const LIMITS = {
  name: 120,
  phone: 20,
  linkedin: 200,
  github: 200,
  note: 5000,
  url: 500,
  quizAnswer: 2000,
} as const;

/**
 * Validates a registration.
 *
 * Free-text fields are length-capped and the choice fields are checked against
 * the same allowlists the form offers — a hand-crafted POST cannot invent a
 * track or a role.
 */
export function validateRegistration(d: RegistrationData): RegistrationErrors {
  const e: RegistrationErrors = {};

  const name = d.name.trim();
  if (name.length < 2) e.name = "Enter your full name.";
  else if (name.length > LIMITS.name) e.name = `Keep your name under ${LIMITS.name} characters.`;

  if (!normaliseEmail(d.email)) e.email = "Enter a valid email address.";

  const phone = d.phone.replace(/[\s()-]/g, "");
  if (!/^\+?\d{10,15}$/.test(phone)) e.phone = "Enter a valid phone number (10–15 digits).";

  if (!d.track) e.track = "Choose a career track.";
  else if (!trackSlugs.includes(d.track as TrackSlug)) e.track = "That track does not exist.";

  if (!d.currentRole) e.currentRole = "Select your current role.";
  else if (!roleOptions.includes(d.currentRole)) e.currentRole = "Choose a role from the list.";

  if (!d.experience) e.experience = "Select your years of experience.";
  else if (!experienceOptions.includes(d.experience)) e.experience = "Choose an experience range from the list.";

  const li = d.linkedin.trim();
  if (li) {
    if (li.length > LIMITS.linkedin) e.linkedin = `Keep the LinkedIn URL under ${LIMITS.linkedin} characters.`;
    else if (!/^(https?:\/\/)?([\w-]+\.)?linkedin\.com\/.+/i.test(li)) e.linkedin = "Enter a LinkedIn URL, or leave this blank.";
  }

  const gh = d.github.trim();
  if (gh) {
    if (gh.length > LIMITS.github) e.github = `Keep the GitHub URL under ${LIMITS.github} characters.`;
    else if (!/^(https?:\/\/)?([\w-]+\.)?github\.com\/.+/i.test(gh)) e.github = "Enter a GitHub URL, or leave this blank.";
  }

  if (!d.consent) e.consent = "Please agree to be contacted about the program.";

  return e;
}

/** Trims to a hard ceiling. Used wherever free text reaches the database. */
export function clamp(value: unknown, max: number): string {
  return String(value ?? "").trim().slice(0, max);
}

/**
 * An http(s) URL within the length ceiling, or null.
 *
 * Over-long input is rejected rather than trimmed: truncating a URL produces a
 * different, working-looking link, which is worse than refusing it.
 */
export function safeUrl(value: unknown, max: number = LIMITS.url): string | null {
  const raw = String(value ?? "").trim();
  if (!raw || raw.length > max) return null;
  try {
    const url = new URL(raw);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}
