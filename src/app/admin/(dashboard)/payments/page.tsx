import { EmptyState } from "@/components/admin/EmptyState";
import { PageTitle } from "@/components/admin/PageTitle";
import { PaymentsTable } from "@/components/admin/PaymentsTable";
import { getPayments } from "@/lib/admin/data";
import { formatINR } from "@/lib/format";

export default async function AdminPaymentsPage() {
  const payments = await getPayments();
  const collected = payments.filter((p) => p.status === "paid").reduce((sum, p) => sum + p.amount, 0);

  return (
    <>
      <PageTitle
        eyebrow="Money"
        title="Payments"
        intro={`Completed payments, newest first. ${formatINR(collected / 100)} currently held. Refunds go back to the learner's original payment method.`}
      />
      {payments.length === 0 ? (
        <EmptyState title="No payments yet" body="Payments appear here as soon as Razorpay confirms them." />
      ) : (
        <PaymentsTable rows={payments} />
      )}
    </>
  );
}
