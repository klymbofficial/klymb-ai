import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { contact } from "@/data/config";

export const metadata: Metadata = { title: "Privacy Policy" };

// TODO: replace with the final, legally reviewed Privacy Policy.
export default function PrivacyPage() {
  return (
    <PageHeader eyebrow="Placeholder" title="Privacy Policy" intro="How Klymb.ai collects and uses personal data will be described here.">
      <p className="text-muted">Questions? Email <a className="font-semibold text-ink underline" href={`mailto:${contact.email}`}>{contact.email}</a>.</p>
    </PageHeader>
  );
}
