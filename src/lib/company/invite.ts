import "server-only";
import { site } from "@/data/config";
import { grievance } from "@/data/legal";
import type { CompanyBrand } from "@/lib/company/brand";
import { publishedBrand } from "@/lib/company/branding-data";
import type { Db } from "@/lib/db/client";
import { companyInviteEmail, sendMail } from "@/lib/mail";

/**
 * The "you've been added" email for a company member, in the company's look,
 * with the way to sign in. Used by Klymb admin (first company admin) and by company admins
 * (People page, including Resend). Never throws: adding the person has
 * already worked, the email is a courtesy.
 */
export async function sendCompanyInvite(p: { email: string; name: string | null; company: CompanyBrand; role: "admin" | "employee"; resend?: boolean }) {
  const { fromName, ...mail } = companyInviteEmail({ ...p, siteUrl: site.url, supportEmail: grievance.email });
  try {
    // No idempotency key: Resend is meant to send the email again.
    const sent = await sendMail({ to: { email: p.email, ...(p.name ? { name: p.name } : {}) }, fromName, ...mail, kind: "company.invite" });
    if (!sent.ok) console.error("company invite email failed:", sent.reason);
    return sent.ok;
  } catch (e) {
    console.error("company invite email failed:", e instanceof Error ? e.message : e);
    return false;
  }
}

/**
 * The company's published look an invite is sent with: name, logo, accent,
 * its own sign-in page and support contact (publishedBrand, 0048). Null when
 * the company can't be read.
 */
export async function loadCompanyBrand(sql: Db, companyId: string): Promise<CompanyBrand | null> {
  const brand = await publishedBrand(sql, companyId);
  if (!brand) return null;
  return {
    name: brand.name, logoUrl: brand.logoUrl, brandColor: brand.accent, slug: brand.slug,
    supportEmail: brand.supportEmail, supportText: brand.supportText,
  };
}
