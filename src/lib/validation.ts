import type { TrackSlug } from "@/types/program";

export interface RegistrationData {
  name: string;
  email: string;
  phone: string;
  track: TrackSlug | "";
  currentRole: string;
  experience: string;
  linkedin: string;
  consent: boolean;
}

export type RegistrationErrors = Partial<Record<keyof RegistrationData, string>>;

export const emptyRegistration: RegistrationData = {
  name: "", email: "", phone: "", track: "", currentRole: "", experience: "", linkedin: "", consent: false,
};

export function validateRegistration(d: RegistrationData): RegistrationErrors {
  const e: RegistrationErrors = {};
  if (d.name.trim().length < 2) e.name = "Enter your full name.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(d.email.trim())) e.email = "Enter a valid email address.";
  if (!/^\+?\d{10,15}$/.test(d.phone.replace(/[\s()-]/g, ""))) e.phone = "Enter a valid phone number (10–15 digits).";
  if (!d.track) e.track = "Choose a career track.";
  if (!d.currentRole) e.currentRole = "Select your current role.";
  if (!d.experience) e.experience = "Select your years of experience.";
  const li = d.linkedin.trim();
  if (li && !/^(https?:\/\/)?([\w-]+\.)?linkedin\.com\/.+/i.test(li)) e.linkedin = "Enter a LinkedIn URL, or leave this blank.";
  if (!d.consent) e.consent = "Please agree to be contacted about the program.";
  return e;
}
