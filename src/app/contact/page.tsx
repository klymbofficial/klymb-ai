import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { contact } from "@/data/config";

export const metadata: Metadata = { title: "Contact" };

export default function ContactPage() {
  return (
    <PageHeader eyebrow="Contact" title="Talk to Klymb.ai" intro="Questions about tracks, the cohort or pricing? Email us and we will get back to you.">
      <a href={`mailto:${contact.email}`} className="display text-3xl underline underline-offset-8 hover:text-red-deep sm:text-4xl">{contact.email}</a>
    </PageHeader>
  );
}
