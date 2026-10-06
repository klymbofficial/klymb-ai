"use client";

import { useState } from "react";
import { refund } from "@/app/admin/payment-actions";
import type { PaymentRow } from "@/lib/admin/data";
import { formatINR } from "@/lib/format";

const dateTime = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });

export function PaymentsTable({ rows }: { rows: PaymentRow[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-line/40 bg-card">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="border-b border-line/40 text-xs font-extrabold uppercase tracking-wider text-muted">
          <tr>
            <th className="px-4 py-3">Paid</th>
            <th className="px-4 py-3">Email</th>
            <th className="px-4 py-3">Track</th>
            <th className="px-4 py-3">Amount</th>
            <th className="px-4 py-3">Payment ID</th>
            <th className="px-4 py-3">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => (
            <tr key={p.id} className="border-b border-line/20 last:border-0">
              <td className="px-4 py-3 whitespace-nowrap">{dateTime(p.created_at)}</td>
              <td className="px-4 py-3">{p.email}</td>
              <td className="px-4 py-3">{p.track}</td>
              <td className="px-4 py-3 font-bold">{formatINR(p.amount / 100)}</td>
              <td className="px-4 py-3 font-mono text-xs">{p.razorpay_payment_id}</td>
              <td className="px-4 py-3"><RefundCell payment={p} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RefundCell({ payment }: { payment: PaymentRow }) {
  const [confirming, setConfirming] = useState(false);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [requested, setRequested] = useState(false);

  if (payment.status === "refunded") return <span className="text-xs font-bold uppercase tracking-wider text-muted">Refunded</span>;
  if (requested) return <span className="text-xs font-bold text-ink">Refund requested. It shows as Refunded once Razorpay confirms.</span>;

  return (
    <span className="flex flex-col items-start gap-1">
      <span className="text-xs font-bold uppercase tracking-wider text-ink">Paid</span>
      {confirming ? (
        <>
          <label htmlFor={`refund-${payment.id}`} className="text-xs font-bold text-red-deep">
            Type {payment.email} to refund {formatINR(payment.amount / 100)}
          </label>
          <input
            id={`refund-${payment.id}`} value={typed} onChange={(e) => setTyped(e.target.value)}
            autoComplete="off" spellCheck={false}
            className="w-56 border-2 border-red-deep bg-white px-2 py-1 text-xs focus:outline-none"
          />
          <span className="flex gap-2">
            <button
              type="button" disabled={busy}
              onClick={async () => {
                setBusy(true);
                setError("");
                const result = await refund(payment.id, typed);
                setBusy(false);
                if (result.ok) setRequested(true);
                else setError(result.message);
              }}
              className="border-2 border-red-deep bg-red-deep px-2 py-1 text-xs font-bold uppercase tracking-wider text-white disabled:opacity-50"
            >
              {busy ? "Refunding…" : "Refund"}
            </button>
            <button
              type="button" onClick={() => { setConfirming(false); setTyped(""); setError(""); }}
              className="rounded-md border border-line/50 px-2 py-1 text-xs font-bold"
            >
              Cancel
            </button>
          </span>
        </>
      ) : (
        <button
          type="button" onClick={() => setConfirming(true)}
          className="text-xs font-bold uppercase tracking-wider text-muted underline underline-offset-2 hover:text-red-deep"
        >
          Refund…
        </button>
      )}
      {error && <span role="alert" className="max-w-[16rem] text-xs font-semibold text-error">{error}</span>}
    </span>
  );
}
