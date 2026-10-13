import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { PayForm } from "./PayForm";
import { OfferBadge } from "@/components/ui/OfferPrice";

export const metadata: Metadata = {
  title: "Unlock the full course",
  description: "Confirm your Klymb.ai cohort seat. Complete all 30 days and get 100% of your fee back.",
  robots: { index: false, follow: true },
};

/** The link to send in payment reminders: works for anyone who has registered, signed in or not. */
export default function PayPage() {
  return (
    <>
      <PageHeader
        eyebrow="Unlock the full course"
        title="Unlock Days 2 to 30."
        intro={`Enter the email you registered with. Day 1 is free; this unlocks the rest of the course, and you get 100% of your fee back when you complete all 30 days.`}
      />
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <OfferBadge className="mb-6 inline-block rounded-full bg-red-strong px-3 py-1 text-xs font-bold text-white" />
        <PayForm />
        <p className="mt-6 text-sm text-muted">
          Haven&apos;t registered? <Link href="/register" className="font-semibold text-ink underline underline-offset-4">Register first</Link>.
          {" "}Refund conditions are in the <Link href="/refund-policy" className="underline underline-offset-4">Refund Policy</Link>.
        </p>
      </section>
    </>
  );
}
