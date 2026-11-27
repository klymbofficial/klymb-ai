import { normalisePhone } from "@/lib/sales";

/**
 * The /organizations form: a company leaves a contact and becomes a B2B sales
 * lead. Pure, so it can be tested without a database.
 */

export interface OrgEnquiryInput {
  name?: unknown;
  email?: unknown;
  org?: unknown;
  phone?: unknown;
}

export interface OrgEnquiry {
  name: string;
  email: string;
  org: string;
  phone: string;
}

export type OrgEnquiryErrors = Partial<Record<keyof OrgEnquiry, string>>;

const text = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "");
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validateOrgEnquiry(input: OrgEnquiryInput): { ok: true; data: OrgEnquiry } | { ok: false; errors: OrgEnquiryErrors } {
  const errors: OrgEnquiryErrors = {};
  const name = text(input.name, 120);
  const email = text(input.email, 200).toLowerCase();
  const org = text(input.org, 120);
  const phone = normalisePhone(text(input.phone, 30));

  if (name.length < 2) errors.name = "Tell us your name.";
  if (!EMAIL.test(email)) errors.email = "Enter an email like you@company.com.";
  if (org.length < 2) errors.org = "Which organization?";
  if (!phone) errors.phone = "Enter a number we can call, like 98765 43210.";

  if (Object.keys(errors).length || !phone) return { ok: false, errors };
  return { ok: true, data: { name, email, org, phone } };
}
