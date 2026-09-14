import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { contact } from "@/data/config";

export const metadata: Metadata = { title: "Terms" };

// TODO: replace with the final, legally reviewed Terms.
export default function TermsPage() {
  return (
    <PageHeader eyebrow="Placeholder" title="Terms" intro="The terms of enrolment and use will be published here before payments open.">
      <p className="text-muted">Questions? Email <a className="font-semibold text-ink underline" href={`mailto:${contact.email}`}>{contact.email}</a>.</p>
    </PageHeader>
  );
}
