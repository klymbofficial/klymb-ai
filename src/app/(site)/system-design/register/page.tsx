import type { Metadata } from "next";
import { PreRegisterForm } from "./PreRegisterForm";
import { SD_PRICE } from "./price";

export const metadata: Metadata = {
  title: "Pre-register · System Design in 15 Days",
  description: "Reserve your place in System Design in 15 Days at the early Diwali price.",
};

const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

const POINTS = [
  "16 lessons, Day 0 to Day 15: one real company story a day, in Hinglish",
  "Answer first, then the story: Flipkart, IRCTC, Swiggy, Hotstar and more",
  "Build each design yourself, then prove it with interview questions",
  "A cheatsheet and a 2-minute interview answer for every day",
];

export default function SystemDesignRegisterPage() {
  const off = Math.round((1 - SD_PRICE.offer / SD_PRICE.full) * 100);
  return (
    <section className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:py-20">
      <div>
        <p className="text-xs font-bold tracking-[0.18em] text-red-strong uppercase">Pre-registration open</p>
        <h1 className="mt-3 text-4xl leading-[1.05] font-extrabold text-ink sm:text-5xl">
          System Design <span className="text-red-strong">in 15 Days</span>
        </h1>
        <p className="mt-4 max-w-xl text-lg text-ink/75">
          Learn how real apps survive millions of users, 15 minutes a day on your phone. Reserve your place now and lock the early price.
        </p>

        <div className="mt-8 rounded-2xl bg-card p-6 ring-1 ring-line/40">
          <div className="flex flex-wrap items-baseline gap-3">
            <span className="text-5xl font-extrabold text-ink">{inr(SD_PRICE.offer)}</span>
            <span className="text-xl text-muted line-through">{inr(SD_PRICE.full)}</span>
            <span className="rounded-full bg-red-strong px-3 py-1 text-xs font-bold text-white">{off}% off</span>
          </div>
          <p className="mt-2 font-bold text-ink">🪔 Early + Diwali offer, for pre-registrations only</p>
          <p className="mt-1 text-sm text-muted">Nothing to pay today. We email you a payment link at this price when the course opens.</p>
        </div>

        <ul className="mt-8 space-y-3">
          {POINTS.map((p) => (
            <li key={p} className="flex gap-3 text-ink/85">
              <span aria-hidden="true" className="mt-1 text-red-strong">✓</span>
              {p}
            </li>
          ))}
        </ul>
      </div>

      <PreRegisterForm price={inr(SD_PRICE.offer)} />
    </section>
  );
}
