"use client";

import { useState, useTransition } from "react";
import { preRegister } from "./actions";

const field = "w-full rounded-xl bg-surface px-4 py-3 text-ink outline-none ring-1 ring-line/50 placeholder:text-muted focus:ring-2 focus:ring-red-strong/50";

export function PreRegisterForm({ price }: { price: string }) {
  const [pending, start] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [done, setDone] = useState(false);

  if (done) {
    return (
      <div className="self-start rounded-2xl bg-card p-8 text-center ring-1 ring-line/40">
        <p className="text-4xl" aria-hidden="true">🎉</p>
        <h2 className="mt-3 text-2xl font-extrabold text-ink">Your place is reserved</h2>
        <p className="mt-2 text-ink/75">Your price is locked at {price}. We&apos;ll email you the payment link when the course opens.</p>
      </div>
    );
  }

  const err = (k: string) => errors[k] && <p className="mt-1 text-sm text-red-strong">{errors[k]}</p>;

  return (
    <form
      className="self-start space-y-4 rounded-2xl bg-card p-6 ring-1 ring-line/40 sm:p-8"
      action={(fd) =>
        start(async () => {
          const res = await preRegister(fd);
          if (res.ok) return setDone(true);
          setErrors(res.errors ?? {});
          setMessage(res.message ?? "");
        })
      }
    >
      <h2 className="text-2xl font-extrabold text-ink">Reserve your place</h2>
      <input name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />

      <div>
        <input name="name" placeholder="Your name" autoComplete="name" maxLength={80} className={field} aria-label="Your name" />
        {err("name")}
      </div>
      <div>
        <input name="email" type="email" placeholder="Email" autoComplete="email" maxLength={254} className={field} aria-label="Email" />
        {err("email")}
      </div>
      <div>
        <input name="phone" type="tel" placeholder="Phone / WhatsApp" autoComplete="tel" maxLength={16} className={field} aria-label="Phone or WhatsApp" />
        {err("phone")}
      </div>

      <fieldset>
        <legend className="mb-2 text-sm font-bold text-ink">I am</legend>
        <div className="grid grid-cols-2 gap-3">
          {[["student", "A student"], ["working", "Working"]].map(([v, l]) => (
            <label key={v} className="flex cursor-pointer items-center gap-2 rounded-xl bg-surface px-4 py-3 ring-1 ring-line/50 has-[:checked]:ring-2 has-[:checked]:ring-red-strong">
              <input type="radio" name="status" value={v} className="accent-red-strong" />
              {l}
            </label>
          ))}
        </div>
        {err("status")}
      </fieldset>

      <label className="flex gap-2 text-sm text-ink/80">
        <input type="checkbox" name="consent" className="mt-0.5 accent-red-strong" />
        Email and WhatsApp me about this course, including the payment link.
      </label>
      {err("consent")}

      <button type="submit" disabled={pending} className="w-full rounded-full bg-red-strong px-6 py-3.5 font-bold text-white transition-colors hover:bg-red-press disabled:opacity-60">
        {pending ? "Reserving…" : `Reserve at ${price}`}
      </button>
      {message && <p className="text-sm text-red-strong">{message}</p>}
      <p className="text-center text-xs text-muted">Nothing to pay today.</p>
    </form>
  );
}
