import { EmptyState } from "@/components/admin/EmptyState";
import { PageTitle } from "@/components/admin/PageTitle";
import { PaymentsTable } from "@/components/admin/PaymentsTable";
import { StatTile } from "@/components/admin/StatTile";
import { getPayments } from "@/lib/admin/data";
import { formatINR } from "@/lib/format";

export default async function AdminPaymentsPage() {
  const payments = await getPayments();
  const paid = payments.filter((p) => p.status === "paid");
  const refunded = payments.filter((p) => p.status === "refunded");
  const pending = paid.filter((p) => p.refund_request);
  const sum = (rows: typeof payments) => formatINR(rows.reduce((s, p) => s + p.amount, 0) / 100);

  return (
    <>
      <PageTitle
        eyebrow="Money"
        title="Payments & refunds"
        intro="Completed payments, newest first. A refund returns the full amount to the learner's original payment method and is normally issued once their 30 days are over. Every refund is recorded in Admin activity."
      />
      <div className="mb-8 grid gap-3 sm:grid-cols-3">
        <StatTile label="Held" value={sum(paid)} hint={`${paid.length} paid payment${paid.length === 1 ? "" : "s"}`} />
        <StatTile label="Refund pending" value={pending.length} hint="Requested, waiting for Razorpay" tone={pending.length ? "red" : "ink"} />
        <StatTile label="Refunded" value={sum(refunded)} hint={`${refunded.length} refund${refunded.length === 1 ? "" : "s"} confirmed`} tone="muted" />
      </div>
      {payments.length === 0 ? (
        <EmptyState title="No payments yet" body="Every course is free right now, so there is nothing to refund. Payments appear here as soon as Razorpay confirms them." />
      ) : (
        <PaymentsTable rows={payments} />
      )}
    </>
  );
}
