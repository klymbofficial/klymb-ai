"use client";

import clsx from "clsx";
import { ArrowRight, CalendarPlus, Check, ChevronDown } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { DIAL_CODES, INDIA_DIAL, phoneProblem, type SdRole } from "@/lib/sd-offer";
import { WEBINAR, WEBINAR_LIMITS, googleCalendarLink, webinarFee, webinarProblems } from "@/lib/webinar";
import { payForSeat } from "@/lib/webinar-checkout";
import { useCountdownParts, useWorkshop } from "./WorkshopClock";

// 16px text: anything smaller makes iPhones zoom the page when a field is tapped.
const field =
  "mt-1.5 block w-full rounded-xl border bg-white px-3.5 py-3 text-base text-ink transition-[border-color,box-shadow] duration-200 placeholder:text-muted/60 focus:outline-none focus-visible:outline-none";
const ok = "border-line/40 focus:border-ink/50 focus:ring-4 focus:ring-ink/5";
const bad = "border-error/60 focus:ring-4 focus:ring-error/10";

const ROLES: { key: SdRole; label: string }[] = [
  { key: "student", label: "Student" },
  { key: "working", label: "Working professional" },
];

/**
 * The sign-up, drawn as an admit-one ticket. It posts to the same endpoint as
 * /workshop, so a seat saved here is the same seat in the same list. For a
 * paid webinar the endpoint hands back an order, and Razorpay opens here.
 */
export function WorkshopRegister() {
  const { open, setRegistered } = useWorkshop();
  const { phase, parts } = useCountdownParts();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [dial, setDial] = useState<string>(WEBINAR.defaultDial);
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<SdRole | "">("");
  const [website, setWebsite] = useState("");
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<{ group: string; emailed: boolean } | null>(null);

  const missing = webinarProblems({ name, email, dial, phone, role });
  const wrong = (what: string) => tried && missing.includes(what);
  const india = dial === INDIA_DIAL;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (missing.length) return setTried(true);
    setBusy(true);
    const res = await fetch("/api/webinar/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, dial, phone, role, website }),
    }).catch(() => null);
    const out = await res?.json().catch(() => null);
    if (res?.ok && out?.ok && out.pay) {
      const seat = await payForSeat(out.pay);
      setBusy(false);
      if (!seat.ok) return setError(seat.error);
      setDone({ group: seat.group, emailed: seat.emailed });
      setRegistered(true);
      return;
    }
    setBusy(false);
    if (res?.ok && out?.ok) {
      setDone({ group: out.group ?? WEBINAR.whatsappGroup, emailed: out.emailed === true });
      setRegistered(true);
      return;
    }
    setError(out?.error ?? "Something went wrong. Check your connection and try again.");
  }

  return (
    <div id="register" className="relative scroll-mt-28 overflow-hidden rounded-card border border-line/30 bg-card shadow-float">
      <div className="flex flex-wrap items-end justify-between gap-4 bg-ink px-6 py-5 text-paper">
        <div className="grid gap-1.5">
          <span className="text-xs uppercase tracking-[0.16em] text-paper/70">Admit one · {webinarFee()}</span>
          <strong className="display display-soft text-2xl leading-[1.1]">{WEBINAR.title}</strong>
        </div>
        <span className="display text-right text-[15px] tracking-[0.04em]">
          {WEBINAR.ticketDate}
          <span className="block text-red-soft">{WEBINAR.startLabel}</span>
        </span>
      </div>
      {/* The tear-off line, with the notches either side. */}
      <div aria-hidden="true" className="relative mx-[18px] h-0 border-t-2 border-dashed border-line/40">
        <span className="absolute -left-[30px] -top-3 size-[22px] rounded-full bg-paper" />
        <span className="absolute -right-[30px] -top-3 size-[22px] rounded-full bg-paper" />
      </div>

      {done ? (
        <div className="grid justify-items-start gap-4 px-6 py-7" role="status">
          <span className="grid size-12 place-items-center rounded-full bg-red-strong text-white"><Check size={24} strokeWidth={3} aria-hidden="true" /></span>
          <strong className="display text-[32px] leading-[1.05]">You&apos;re in, {name.trim().split(/\s+/)[0] || "friend"}.</strong>
          <p className="text-base leading-relaxed">
            The joining link is on its way to {email.trim()}. Join the WhatsApp group now: the Google Meet link is shared there on the day.
            {done.emailed && " We've also emailed you a confirmation."} Block the hour so nothing lands on top of it.
          </p>
          <a href={done.group} target="_blank" rel="noopener noreferrer" className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#1f7a43] px-5 py-4 text-base font-bold text-white no-underline transition-[background-color,transform] duration-150 hover:bg-[#186537] active:scale-[0.98]">
            Join the WhatsApp group <ArrowRight size={18} aria-hidden="true" />
          </a>
          <a href={googleCalendarLink()} target="_blank" rel="noopener noreferrer" className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-line/50 bg-white px-5 py-3.5 text-[15px] font-bold text-ink no-underline hover:border-ink/40">
            <CalendarPlus size={18} aria-hidden="true" />Add to Google Calendar
          </a>
        </div>
      ) : !open ? (
        <div className="px-6 py-8" role="status">
          <h2 className="display text-3xl">Registration is closed</h2>
          <p className="mt-3 max-w-sm text-[15px] leading-relaxed text-muted">This webinar has ended. Follow Klymb.ai to hear about the next one.</p>
        </div>
      ) : (
        <form noValidate onSubmit={submit} className="grid gap-4 px-6 py-6">
          {phase === "before" && (
            <ul className="nums grid grid-cols-4 gap-1.5" aria-label="Time until the webinar starts">
              {parts.map((c) => (
                <li key={c.l} className="grid justify-items-start gap-0.5 rounded-xl bg-red-tint px-3 py-2.5">
                  <strong className="display display-soft text-[26px] leading-none text-red-strong">{c.v}</strong>
                  <span className="text-[11px] uppercase tracking-[0.1em] text-red-strong">{c.l}</span>
                </li>
              ))}
            </ul>
          )}

          {/* Hidden from people; bots fill it in. */}
          <input type="text" name="website" value={website} onChange={(e) => setWebsite(e.target.value)} tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 opacity-0" />

          <div>
            <label htmlFor="ws-name" className="text-sm font-semibold">Your name</label>
            <input id="ws-name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" placeholder="Aditi Sharma" maxLength={WEBINAR_LIMITS.name} aria-invalid={wrong("your name")} className={clsx(field, wrong("your name") ? bad : ok)} />
          </div>

          <div>
            <label htmlFor="ws-email" className="text-sm font-semibold">Email</label>
            <input id="ws-email" type="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" autoCapitalize="none" spellCheck={false} placeholder="you@email.com" maxLength={254} aria-invalid={wrong("a valid email")} className={clsx(field, wrong("a valid email") ? bad : ok)} />
          </div>

          <div>
            <label htmlFor="ws-phone" className="text-sm font-semibold">WhatsApp number <span className="font-normal text-muted">for the joining link</span></label>
            <div className="flex gap-2">
              {/* The list names each country; the closed box shows just the flag and code, so it stays narrow. */}
              <div className="relative w-[104px] flex-none">
                <select value={dial} onChange={(e) => setDial(e.target.value)} aria-label="Country code" autoComplete="tel-country-code" className={clsx(field, ok, "cursor-pointer appearance-none text-transparent")}>
                  {DIAL_CODES.map((c) => <option key={c.dial} value={c.dial} className="text-ink">{`${c.flag} ${c.name} (+${c.dial})`}</option>)}
                </select>
                <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 top-1.5 flex items-center gap-1 pl-3.5 text-base font-semibold text-ink">
                  {DIAL_CODES.find((c) => c.dial === dial)?.flag} +{dial}
                  <ChevronDown size={14} className="text-muted" />
                </span>
              </div>
              <input id="ws-phone" type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel-national" placeholder={india ? "98765 43210" : "Phone number"} maxLength={20} aria-invalid={wrong(phoneProblem(dial))} className={clsx(field, "min-w-0", wrong(phoneProblem(dial)) ? bad : ok)} />
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold">Right now I&apos;m</p>
            <div role="radiogroup" aria-label="Right now I'm" className="mt-2 flex flex-wrap gap-1.5">
              {ROLES.map((o) => {
                const on = role === o.key;
                return (
                  <button
                    key={o.key} type="button" role="radio" aria-checked={on} onClick={() => setRole(o.key)}
                    className={clsx(
                      "rounded-full border px-3.5 py-2.5 text-[15px] transition-[background-color,color,border-color,transform] duration-150 active:scale-[0.97]",
                      on ? "border-ink bg-ink text-paper" : tried && !role ? "border-error/50 bg-white text-ink" : "border-line/40 bg-white text-ink hover:border-ink/40",
                    )}
                  >
                    {o.label}
                  </button>
                );
              })}
            </div>
          </div>

          {tried && missing.length > 0 && <p role="alert" className="rounded-xl bg-error-tint px-4 py-3 text-sm font-medium text-error">Add {missing.join(", ")}.</p>}
          {error && <p role="alert" className="rounded-xl bg-error-tint px-4 py-3 text-sm font-medium text-error">{error}</p>}

          <button type="submit" disabled={busy} className="flex w-full items-center justify-between rounded-xl bg-red-strong px-5 py-[18px] text-lg font-bold text-white transition-[background-color,transform] duration-150 hover:bg-red-press active:scale-[0.99] disabled:opacity-60">
            {busy ? (WEBINAR.price ? "Opening payment…" : "Saving your seat…") : WEBINAR.price ? `Pay ${WEBINAR.price.label} & save my seat` : "Save my free seat"}
            {!busy && <ArrowRight size={20} aria-hidden="true" />}
          </button>
          <p className="text-[13px] leading-relaxed text-muted">
            {WEBINAR.price ? `${WEBINAR.price.label} (${WEBINAR.price.currency}), paid securely with Razorpay. Your seat is saved once it's paid.` : "No payment, no card."} The joining link comes to your email and WhatsApp before we start. We only use your details for this webinar and Klymb.ai&apos;s courses ·{" "}
            <Link href="/privacy" className="underline underline-offset-2">Privacy</Link>
          </p>
        </form>
      )}
    </div>
  );
}
