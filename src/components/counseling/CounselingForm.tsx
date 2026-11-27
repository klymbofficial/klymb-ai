"use client";

import clsx from "clsx";
import { ArrowRight, Check, ChevronDown, UsersRound } from "lucide-react";
import { useState } from "react";
import { submitCounseling, type CounselingResult } from "@/app/(site)/counseling/actions";
import { PASSING_YEARS, ROLES, type CounselingErrors } from "@/lib/counseling";

/** What the team promises after a request; shown under the button and on the thank-you. */
export const REPLY_LINE = "We'll WhatsApp you within 48 hours to fix the time.";

// 16px text: anything smaller makes iPhones zoom the page when a field is tapped.
// Compact on purpose: the whole form, button included, should fit a laptop's first screen.
const input =
  "peer block w-full rounded-xl border bg-surface/40 px-3.5 pb-1.5 pt-5 text-base text-ink transition-[border-color,box-shadow,background-color] duration-200 placeholder:text-transparent focus:bg-white focus:outline-none focus-visible:outline-none";
const ok = "border-line/40 hover:border-line/70 focus:border-ink/50 focus:ring-4 focus:ring-ink/5";
const bad = "border-error/60 focus:ring-4 focus:ring-error/10";
// The label sits inside the field and slides up once there is something in it.
const label =
  "pointer-events-none absolute left-3.5 top-1 text-[11px] font-bold uppercase tracking-[0.08em] text-muted transition-all duration-150 peer-placeholder-shown:top-3 peer-placeholder-shown:text-base peer-placeholder-shown:font-medium peer-placeholder-shown:normal-case peer-placeholder-shown:tracking-normal peer-focus:top-1 peer-focus:text-[11px] peer-focus:font-bold peer-focus:uppercase peer-focus:tracking-[0.08em] peer-focus:text-ink";
// Selects always show a value, so their label stays up.
const fixedLabel = "pointer-events-none absolute left-3.5 top-1 text-[11px] font-bold uppercase tracking-[0.08em] text-muted";

type Id = keyof CounselingErrors;

function FieldError({ id, text }: { id: string; text?: string }) {
  return text ? <p id={`cs-${id}-error`} className="mt-1 text-xs font-medium text-error">{text}</p> : null;
}

function Field({ id, label: text, type = "text", auto, mode, errors }: { id: Id; label: string; type?: string; auto?: string; mode?: "text" | "tel" | "email"; errors: CounselingErrors }) {
  return (
    <div>
      <div className="relative">
        <input
          id={`cs-${id}`}
          name={id}
          type={type}
          inputMode={mode}
          autoComplete={auto}
          autoCapitalize={type === "email" ? "none" : undefined}
          spellCheck={id === "name" ? undefined : false}
          placeholder={text}
          aria-invalid={!!errors[id]}
          aria-describedby={errors[id] ? `cs-${id}-error` : undefined}
          className={clsx(input, errors[id] ? bad : ok)}
        />
        <label htmlFor={`cs-${id}`} className={label}>{text}</label>
      </div>
      <FieldError id={id} text={errors[id]} />
    </div>
  );
}

function Select({ id, label: text, options, placeholder, errors }: { id: Id; label: string; options: readonly string[]; placeholder: string; errors: CounselingErrors }) {
  return (
    <div>
      <div className="relative">
        <select
          id={`cs-${id}`}
          name={id}
          defaultValue=""
          aria-invalid={!!errors[id]}
          aria-describedby={errors[id] ? `cs-${id}-error` : undefined}
          className={clsx(input, errors[id] ? bad : ok, "cursor-pointer appearance-none pr-9")}
        >
          <option value="">{placeholder}</option>
          {options.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
        <label htmlFor={`cs-${id}`} className={fixedLabel}>{text}</label>
        <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
      </div>
      <FieldError id={id} text={errors[id]} />
    </div>
  );
}

export function CounselingForm() {
  const [errors, setErrors] = useState<CounselingErrors>({});
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ firstName: string; community: string | null } | null>(null);

  if (done) {
    return (
      <div className="cs-done flex min-h-[22rem] flex-col items-center justify-center py-4 text-center" role="status">
        <div aria-hidden="true" className="grid size-16 place-items-center rounded-full bg-red-strong text-white shadow-float">
          <Check className="size-8" strokeWidth={3} />
        </div>
        <h2 className="display mt-5 text-3xl">{done.firstName ? `Request sent, ${done.firstName}.` : "Request sent."}</h2>
        <p className="mx-auto mt-2 max-w-xs text-[15px] text-muted">{REPLY_LINE} Calls are in the evening, 5–9 PM IST.</p>
        {done.community ? (
          <a
            href={done.community}
            target="_blank"
            rel="noopener noreferrer"
            className="group mt-6 inline-flex items-center gap-2 rounded-xl bg-[#1f8f4e] px-5 py-3.5 text-base font-bold text-white transition-[background-color,transform] duration-150 hover:bg-[#187540] active:scale-[0.98]"
          >
            <UsersRound aria-hidden="true" className="size-5" />
            Join the free community
          </a>
        ) : (
          <p className="mt-4 max-w-xs text-sm text-muted">We&apos;ll send you the community invite on WhatsApp too.</p>
        )}
      </div>
    );
  }

  return (
    <form
      noValidate
      onSubmit={async (e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const f = new FormData(form);
        setBusy(true);
        setMessage("");
        const r = await submitCounseling(
          {
            name: f.get("name"),
            phone: f.get("phone"),
            role: f.get("role"),
            email: f.get("email"),
            college: f.get("college"),
            year: f.get("year"),
            question: f.get("question"),
          },
          String(f.get("website") ?? ""),
        ).catch((): CounselingResult => ({ ok: false, message: "Something went wrong. Check your connection and try again." }));
        setBusy(false);
        if (r.ok) {
          setDone({ firstName: r.firstName, community: r.community });
          // The thank-you is shorter than the form: keep it in view on a phone.
          requestAnimationFrame(() => document.getElementById("book")?.scrollIntoView({ block: "start", behavior: "smooth" }));
          return;
        }
        setErrors(r.errors ?? {});
        setMessage(r.message ?? "");
        // On a phone the first problem may be off screen: bring it into view.
        requestAnimationFrame(() => form.querySelector("[id$='-error'], [role=alert]")?.scrollIntoView({ block: "center", behavior: "smooth" }));
      }}
      // An error goes as soon as its field is edited (selects fire input too), not on the next send.
      onInput={(e) => {
        const name = (e.target as HTMLInputElement).name as Id;
        if (errors[name]) setErrors((x) => ({ ...x, [name]: undefined }));
      }}
      className="flex flex-col gap-2.5"
    >
      <div className="mb-1">
        <h2 className="display text-[1.65rem] leading-tight sm:text-3xl">Request your free 1:1 call.</h2>
        <p className="mt-1 text-sm text-muted">Free · Evening calls, 5–9 PM IST · Time confirmed on WhatsApp</p>
      </div>

      {/* Hidden from people; bots fill it in. */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 opacity-0" />

      <Field id="name" label="Your name" auto="name" errors={errors} />
      <Field id="phone" label="WhatsApp number" type="tel" auto="tel" mode="tel" errors={errors} />
      <Select id="role" label="Career interest" placeholder="Choose one" options={ROLES} errors={errors} />

      <p className="mt-1.5 text-xs font-extrabold uppercase tracking-[0.14em] text-muted">Optional</p>
      <Field id="email" label="Email" type="email" auto="email" mode="email" errors={errors} />
      <div className="grid grid-cols-[3fr_2fr] gap-2.5">
        <Field id="college" label="College" auto="organization" errors={errors} />
        <Select id="year" label="Passing year" placeholder="—" options={PASSING_YEARS} errors={errors} />
      </div>
      <Field id="question" label="Anything to ask?" errors={errors} />

      {message && <p role="alert" className="rounded-xl bg-error-tint px-4 py-3 text-sm font-medium text-error">{message}</p>}

      <button
        type="submit"
        disabled={busy}
        className="group mt-1.5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-red-strong px-5 py-3.5 text-base font-bold text-white transition-[background-color,transform] duration-150 hover:bg-red-press active:scale-[0.98] disabled:opacity-60"
      >
        {busy ? "Sending…" : "Request my free call"}
        {!busy && <ArrowRight aria-hidden="true" className="size-4 transition-transform duration-200 group-hover:translate-x-1" />}
      </button>
      <p className="text-center text-xs text-muted">{REPLY_LINE}</p>
    </form>
  );
}
