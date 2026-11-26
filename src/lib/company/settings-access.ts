import "server-only";
import { redirect } from "next/navigation";
import { isAdmin, type CompanyMember } from "@/lib/company/access";
import { requireCompany } from "@/lib/company/auth";

/** For the Company and Billing sections: an admin of this company; anyone else goes to their own details. */
export async function requireSettingsAdmin(slug: string): Promise<CompanyMember> {
  const member = await requireCompany(slug);
  if (!isAdmin(member)) redirect(`/org/${member.companySlug}/settings/personal`);
  return member;
}
