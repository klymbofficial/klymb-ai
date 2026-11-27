import type { Metadata } from "next";
import { LoadError } from "@/components/company/OrgPanels";
import { CompanySwitchControl, SettingsCard, SettingsHead } from "@/components/company/SettingsParts";
import { requireSettingsAdmin } from "@/lib/company/settings-access";
import { loadCompanySettings } from "@/lib/company/settings-data";
import { db } from "@/lib/db/client";

export const metadata: Metadata = { title: "AI features", robots: { index: false, follow: false } };

/**
 * AI features (user, 26 Nov): whether reviewers may ask AI to suggest scores
 * for written answers. Off by default, because it sends candidates' answers
 * to an outside AI service. Reading a job description needs no switch: it
 * sends only the description, never anything about a person.
 */
export default async function AiSettingsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const admin = await requireSettingsAdmin(slug);
  const sql = db();
  const company = sql ? await loadCompanySettings(sql, admin.companyId) : null;
  return (
    <>
      <SettingsHead title="AI features" intro="Let AI help your reviewers. People still make every decision." />
      {company ? (
        <SettingsCard>
          <CompanySwitchControl
            slug={admin.companySlug}
            setting="ai_review_suggestions"
            label="AI suggestions for written answers"
            description="Reviewers get a 'Suggest scores' button. For each rubric area it proposes points, quotes the lines of the answer that support them and lists what's missing. The reviewer accepts or changes every score; only their saved review counts."
            initial={company.ai_review_suggestions}
          />
          <div className="mt-4 rounded-md bg-slate-50 p-4 text-sm text-muted">
            <p className="font-semibold text-ink">What is sent, and what is kept</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Sent to OpenAI: the question, its rubric and the candidate&apos;s written answer. Never their name or email. OpenAI is asked not to keep it.</li>
              <li>Kept here: each suggestion, with who asked and when, next to the reviewer&apos;s final scores, so you can always compare them.</li>
              <li>Job descriptions read when creating an assessment are sent the same way and aren&apos;t kept.</li>
            </ul>
          </div>
        </SettingsCard>
      ) : <LoadError what="This setting" />}
    </>
  );
}
