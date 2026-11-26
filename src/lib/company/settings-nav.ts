import { isAdmin, type CompanyMember } from "@/lib/company/access";

export interface SettingsLink { href: string; label: string }
export interface SettingsGroup { label: string; links: SettingsLink[] }

/**
 * The Settings menu, grouped as HackerEarth's is (user, 26 Nov): Personal
 * for everyone; Company and Billing for admins. Team Management is left out
 * because Team has its own place in the sidebar.
 */
export function settingsGroups(member: CompanyMember): SettingsGroup[] {
  const base = `/org/${member.companySlug}/settings`;
  const link = (path: string, label: string) => ({ href: `${base}/${path}`, label });
  const groups: SettingsGroup[] = [
    { label: "Personal", links: [link("personal", "Personal Information"), link("email", "Email preference"), link("security", "Security and sign in"), link("api", "API details")] },
  ];
  if (isAdmin(member)) {
    groups.push(
      { label: "Company", links: [link("company", "Company Information"), link("diversity", "Diversity and Inclusion"), link("terms", "Terms of Use"), link("eeo", "EEO compliance"), link("ai", "AI features"), link("integrations", "Integrations")] },
      { label: "Billing", links: [link("plan", "Plan and usage")] },
    );
  }
  return groups;
}

/** Company and Billing sections are for admins; anyone else is sent to their own details. */
export const ADMIN_SECTIONS = ["company", "diversity", "terms", "eeo", "ai", "integrations", "plan"] as const;
