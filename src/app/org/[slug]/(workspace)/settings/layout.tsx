import { SettingsNav } from "@/components/company/SettingsParts";
import { requireCompany } from "@/lib/company/auth";
import { settingsGroups } from "@/lib/company/settings-nav";

/** Settings, laid out like HackerEarth's: the section menu on the left, the section on the right. */
export default async function SettingsLayout({ children, params }: { children: React.ReactNode; params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const member = await requireCompany(slug);
  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-10">
      <SettingsNav groups={settingsGroups(member)} />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
