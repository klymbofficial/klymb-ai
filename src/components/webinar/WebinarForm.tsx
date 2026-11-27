"use client";

import clsx from "clsx";
import { CalendarPlus, ChevronDown } from "lucide-react";
import { useState } from "react";
import { DIAL_CODES, INDIA_DIAL, phoneProblem, type SdRole } from "@/lib/sd-offer";
import { WEBINAR, WEBINAR_LIMITS, googleCalendarLink, webinarProblems } from "@/lib/webinar";
import { payForSeat } from "@/lib/webinar-checkout";
import { trackEvent } from "@/lib/analytics";

// 16px text: anything smaller makes iPhones zoom the page when a field is tapped. Same fields as /join.
const input =
  "mt-1.5 block w-full rounded-xl border bg-surface/40 px-4 py-3 text-base text-ink transition-[border-color,box-shadow,background-color] duration-200 placeholder:text-muted/60 focus:bg-white focus:outline-none focus-visible:outline-none";
const ok = "border-line/40 focus:border-ink/50 focus:ring-4 focus:ring-ink/5";
const bad = "border-error/60 focus:ring-4 focus:ring-error/10";

const ROLES: { key: SdRole; label: string }[] = [
  { key: "student", label: "Student" },
  { key: "working", label: "Working professional" },
];

/** The sign-up, in /join's style; after sending, the WhatsApp group and the calendar. */
export function WebinarForm({ open }: { open: boolean }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [dial, setDial] = useState<string>(WEBINAR.defaultDial);
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<SdRole | "">("");
  const [org, setOrg] = useState("");
  const [question, setQuestion] = useState("");
  const [website, setWebsite] = useState("");
  const [tried, setTried] = useState(false);
  const [started, setStarted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<{ group: string; emailed: boolean } | null>(null);

  const missing = webinarProblems({ name, email, dial, phone, role });
  const wrong = (what: string) => tried && missing.includes(what);
  const india = dial === INDIA_DIAL;

  if (!open) {
    return (
      <div className="py-6 text-center" role="status">
        <h2 className="display text-3xl">Registration is closed</h2>
        <p className="mx-auto mt-3 max-w-sm text-[15px] leading-relaxed text-muted">This webinar has ended. Follow Klymb.ai to hear about the next one.</p>
      </div>
    );
  }

  if (done) {
    return (
      <div className="py-6 text-center" role="status">
        <div aria-hidden="true" className="mx-auto grid size-16 place-items-center rounded-full bg-emerald-50 text-3xl ring-1 ring-emerald-200">✓</div>
        <h2 className="display mt-5 text-3xl">You&apos;re registered!</h2>
        <p className="mx-auto mt-3 max-w-sm text-[15px] leading-relaxed text-muted">
          Join the WhatsApp group now: the Google Meet link is shared there, and by email, on the day.{done.emailed && " We've also emailed you a confirmation."}
        </p>
        <a href={done.group} target="_blank" rel="noopener noreferrer" className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#1f7a43] px-5 py-4 text-base font-bold text-white no-underline transition-[background-color,transform] duration-150 hover:bg-[#186537] active:scale-[0.98]">
          Join the WhatsApp group <span aria-hidden="true">→</span>
        </a>
        <a href={googleCalendarLink()} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-line/50 bg-white px-5 py-3.5 text-[15px] font-bold text-ink no-underline hover:border-ink/40">
          <CalendarPlus size={18} aria-hidden="true" />Add to Google Calendar
        </a>
      </div>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (missing.length) {
      trackEvent("webinar_form_error", { missing: missing.length, form: "plain" }, { missing: missing.length });
      return setTried(true);
    }
    trackEvent("webinar_register_submit", { form: "plain", country_code: dial, role }, { country_code: dial, form: "plain" });
    setBusy(true);
    const res = await fetch("/api/webinar/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, dial, phone, role, org, question, website }),
    }).catch(() => null);
    const out = await res?.json().catch(() => null);
    if (res?.ok && out?.ok && out.pay) {
      const seat = await payForSeat(out.pay);
      setBusy(false);
      return seat.ok ? setDone({ group: seat.group, emailed: seat.emailed }) : setError(seat.error);
    }
    setBusy(false);
    if (res?.ok && out?.ok) return setDone({ group: out.group ?? WEBINAR.whatsappGroup, emailed: out.emailed === true });
    setError(out?.error ?? "Something went wrong. Check your connection and try again.");
  }

  return (
    <form noValidate onSubmit={submit} onFocus={() => { if (!started) { setStarted(true); trackEvent("webinar_form_start", { form: "plain" }, { form: "plain" }); } }} className="flex flex-col gap-5">
      <div>
        <h2 className="display text-2xl sm:text-3xl">Save your seat</h2>
        <p className="mt-1 text-sm text-muted">{WEBINAR.price ? `${WEBINAR.price.label}, paid with Razorpay.` : "Free."} Takes 30 seconds. {WEBINAR.dateLabel}, {WEBINAR.timeLabel}.</p>
      </div>

      {/* Hidden from people; bots fill it in. */}
      <input type="text" name="website" value={website} onChange={(e) => setWebsite(e.target.value)} tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 opacity-0" />

      <div>
        <label htmlFor="w-name" className="text-[13px] font-bold">Your name</label>
        <input id="w-name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" placeholder="Rohan Sharma" maxLength={WEBINAR_LIMITS.name} aria-invalid={wrong("your name")} className={clsx(input, wrong("your name") ? bad : ok)} />
      </div>

      <div>
        <label htmlFor="w-email" className="text-[13px] font-bold">Email</label>
        <input id="w-email" type="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" autoCapitalize="none" spellCheck={false} placeholder="you@gmail.com" maxLength={254} aria-invalid={wrong("a valid email")} className={clsx(input, wrong("a valid email") ? bad : ok)} />
      </div>

      <div>
        <label htmlFor="w-phone" className="text-[13px] font-bold">WhatsApp number</label>
        <div className="flex gap-2">
          {/* The list names each country; the closed box shows just the flag and code, so it stays narrow. */}
          <div className="relative w-[104px] flex-none">
            <select value={dial} onChange={(e) => setDial(e.target.value)} aria-label="Country code" autoComplete="tel-country-code" className={clsx(input, ok, "cursor-pointer appearance-none text-transparent")}>
              {DIAL_CODES.map((c) => <option key={c.dial} value={c.dial} className="text-ink">{`${c.flag} ${c.name} (+${c.dial})`}</option>)}
            </select>
            <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 top-1.5 flex items-center gap-1 pl-4 text-base font-semibold text-ink">
              {DIAL_CODES.find((c) => c.dial === dial)?.flag} +{dial}
              <ChevronDown size={14} className="text-muted" />
            </span>
          </div>
          <input id="w-phone" type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel-national" placeholder={india ? "98765 43210" : "Phone number"} maxLength={20} aria-invalid={wrong(phoneProblem(dial))} className={clsx(input, "min-w-0", wrong(phoneProblem(dial)) ? bad : ok)} />
        </div>
      </div>

      <div>
        <p className="text-[13px] font-bold">You are</p>
        <div role="radiogroup" aria-label="You are" className="mt-2 flex flex-wrap gap-2">
          {ROLES.map((o) => {
            const on = role === o.key;
            return (
              <button
                key={o.key} type="button" role="radio" aria-checked={on} onClick={() => setRole(o.key)}
                className={clsx(
                  "rounded-full border px-4 py-2 text-sm font-semibold transition-[background-color,color,border-color,transform] duration-150 active:scale-[0.97]",
                  on ? "border-ink bg-ink text-paper" : tried && !role ? "border-error/50 bg-white text-ink" : "border-line/40 bg-white text-ink hover:border-ink/40",
                )}
              >
                {o.label}
              </button>
            );
          })}
        </div>
      </div>

      {role && (
        <div>
          <label htmlFor="w-org" className="text-[13px] font-bold">{role === "working" ? "Company" : "College"} <span className="font-normal text-muted">(optional)</span></label>
          <input id="w-org" value={org} onChange={(e) => setOrg(e.target.value)} autoComplete={role === "working" ? "organization" : "off"} placeholder={role === "working" ? "TCS, Swiggy, a startup…" : "VIT, DTU, LPU…"} maxLength={WEBINAR_LIMITS.org} className={clsx(input, ok)} />
        </div>
      )}

      <div>
        <label htmlFor="w-question" className="text-[13px] font-bold">A question for the Q&amp;A <span className="font-normal text-muted">(optional)</span></label>
        <textarea id="w-question" value={question} onChange={(e) => setQuestion(e.target.value)} rows={3} placeholder="What do you want answered live?" maxLength={WEBINAR_LIMITS.question} className={clsx(input, ok, "resize-y")} />
      </div>

      {tried && missing.length > 0 && <p role="alert" className="rounded-xl bg-error-tint px-4 py-3 text-sm font-medium text-error">Add {missing.join(", ")}.</p>}
      {error && <p role="alert" className="rounded-xl bg-error-tint px-4 py-3 text-sm font-medium text-error">{error}</p>}

      <button
        type="submit"
        disabled={busy}
        className="mt-1 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-red-strong px-5 py-4 text-base font-bold text-white transition-[background-color,transform] duration-150 hover:bg-red-press active:scale-[0.98] disabled:opacity-60"
      >
        {busy ? (WEBINAR.price ? "Opening payment…" : "Saving your seat…") : WEBINAR.price ? `Pay ${WEBINAR.price.label} & register` : "Register for free"}
        {!busy && <span aria-hidden="true">→</span>}
      </button>
    </form>
  );
}
