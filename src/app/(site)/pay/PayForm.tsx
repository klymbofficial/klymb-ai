"use client";

import { useState } from "react";
import { PayButton } from "@/components/home/PayButton";

/** Email in, checkout out: the amount comes from that email's registration, on the server. */
export function PayForm() {
  const [email, setEmail] = useState("");
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());

  return (
    <div className="card max-w-lg p-6 sm:p-8">
      <label htmlFor="pay-email" className="text-sm font-bold">Email you registered with</label>
      <input
        id="pay-email"
        type="email"
        autoComplete="email"
        spellCheck={false}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        className="mt-2 w-full rounded-lg border border-line/50 bg-surface/60 px-4 py-3 text-[15px] outline-none focus:border-ink"
      />
      <div className="mt-5">
        <PayButton email={valid ? email.trim() : ""} tone="light" />
      </div>
      <p className="mt-4 text-xs text-muted">Payments are processed securely by Razorpay. Not registered yet? Register first, then pay.</p>
    </div>
  );
}
