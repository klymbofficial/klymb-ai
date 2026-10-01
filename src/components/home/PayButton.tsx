"use client";

import { useSyncExternalStore } from "react";
import { Button } from "@/components/ui/Button";
import { formatINR } from "@/lib/format";

interface RazorpaySuccess {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

interface RazorpayInstance {
  open(): void;
  on(event: "payment.failed", cb: (r: { error: { description?: string } }) => void): void;
}

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => RazorpayInstance;
  }
}

const SCRIPT = "https://checkout.razorpay.com/v1/checkout.js";

/** Loads checkout.js once, on first click, rather than on every page. */
function loadCheckout(): Promise<boolean> {
  if (window.Razorpay) return Promise.resolve(true);
  return new Promise((resolve) => {
    const s = document.createElement("script");
    s.src = SCRIPT;
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

type State = { kind: "idle" | "busy" | "paid" } | { kind: "error"; message: string };

/*
 * Payment state lives outside the component. The confirmation modal closes
 * before checkout opens (a modal <dialog> sits in the top layer, above and
 * inert to Razorpay's frame), and the same success card then renders inline
 * with its own PayButton: both must show the same state.
 */
const IDLE: State = { kind: "idle" };
const states = new Map<string, State>();
const listeners = new Set<() => void>();
const subscribe = (fn: () => void) => (listeners.add(fn), () => void listeners.delete(fn));
function setShared(email: string, next: State | ((s: State) => State)) {
  const prev = states.get(email) ?? IDLE;
  states.set(email, typeof next === "function" ? next(prev) : next);
  listeners.forEach((fn) => fn());
}

/** Razorpay Standard Checkout for a registered learner. */
/** `light` sits on a pale surface (dashboard, /pay); the default sits on the dark success card. */
export function PayButton({ email, price, tone = "dark" }: { email: string; price?: number; tone?: "dark" | "light" }) {
  const light = tone === "light";
  const state = useSyncExternalStore(subscribe, () => states.get(email) ?? IDLE, () => IDLE);
  const setState = (next: State | ((s: State) => State)) => setShared(email, next);

  async function pay(e: React.MouseEvent<HTMLButtonElement>) {
    e.currentTarget.closest("dialog")?.close();
    setState({ kind: "busy" });
    const fail = (message: string) => setState({ kind: "error", message });

    if (!(await loadCheckout()) || !window.Razorpay) return fail("Could not load the payment window. Check your connection and try again.");

    const res = await fetch("/api/create-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    }).catch(() => null);
    const order = await res?.json().catch(() => null);
    if (!res?.ok || !order?.order_id) return fail(order?.error ?? "Could not start the payment. Please try again.");

    const rzp = new window.Razorpay({
      key: order.key_id,
      order_id: order.order_id,
      amount: order.amount,
      currency: order.currency,
      name: "Klymb.ai",
      description: `${order.track_name} · 30-day cohort`,
      prefill: order.prefill,
      theme: { color: "#83050B" },
      handler: async (r: RazorpaySuccess) => {
        const v = await fetch("/api/verify-payment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(r),
        }).catch(() => null);
        const out = await v?.json().catch(() => null);
        if (v?.ok && out?.ok) setState({ kind: "paid" });
        else fail(out?.error ?? `We could not confirm the payment. Email us with payment ID ${r.razorpay_payment_id}.`);
      },
      modal: { ondismiss: () => setState((s) => (s.kind === "busy" ? { kind: "error", message: "Payment cancelled. You can try again any time." } : s)) },
    });
    rzp.on("payment.failed", (r) => fail(r.error?.description ?? "The payment failed. No money was taken; please try again."));
    rzp.open();
  }

  if (state.kind === "paid") {
    return <p role="status" className={light ? "rounded-card bg-card px-5 py-3 text-[15px] font-bold text-ink shadow-card" : "mt-8 rounded-card bg-white/10 px-5 py-4 text-[15px] font-bold text-white"}>Payment received. Your seat is confirmed.</p>;
  }

  return (
    <div className={light ? "flex flex-col items-start gap-2" : "mt-8 flex flex-col items-center gap-3"}>
      <Button onClick={pay} disabled={state.kind === "busy" || !email} arrow className="rounded-full px-7">
        {state.kind === "busy" ? "Opening payment…" : price ? `Pay ${formatINR(price)} to confirm your seat` : "Continue to payment"}
      </Button>
      {state.kind === "error" && <p role="alert" className={light ? "text-sm font-semibold text-red-deep" : "text-sm text-white/85"}>{state.message}</p>}
    </div>
  );
}
