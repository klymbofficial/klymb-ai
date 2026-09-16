import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { contact } from "@/data/config";

export const metadata: Metadata = { title: "Refund Policy" };

// TODO: replace with the final, legally reviewed Refund Policy.
export default function RefundPage() {
  return (
    <PageHeader eyebrow="Placeholder" title="Refund Policy" intro="The refund and transfer policy is being finalised and will be published before payments open.">
      <p className="text-muted">Questions? Email <a className="font-semibold text-ink underline" href={`mailto:${contact.email}`}>{contact.email}</a>.</p>
    </PageHeader>
  );
}
