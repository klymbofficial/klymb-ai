"use client";

import clsx from "clsx";
import { ArrowRight, Check, ChevronDown, UsersRound } from "lucide-react";
import { useState } from "react";
import { submitCounseling, type CounselingResult } from "@/app/(site)/counseling/actions";
import { PASSING_YEARS, ROLES, type CounselingErrors } from "@/lib/counseling";

// 16px text: anything smaller makes iPhones zoom the page when a field is tapped.
const input =
  "peer block w-full rounded-xl border bg-surface/40 px-4 pb-2.5 pt-6 text-base text-ink transition-[border-color,box-shadow,background-color] duration-200 placeholder:text-transparent focus:bg-white focus:outline-none focus-visible:outline-none";
const ok = "border-line/40 hover:border-line/70 focus:border-ink/50 focus:ring-4 focus:ring-ink/5";
const bad = "border-error/60 focus:ring-4 focus:ring-error/10";
// The label sits inside the field and slides up once there is something in it.
const label =
  "pointer-events-none absolute left-4 top-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-muted transition-all duration-150 peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-placeholder-shown:font-medium peer-placeholder-shown:normal-case peer-placeholder-shown:tracking-normal peer-focus:top-1.5 peer-focus:text-[11px] peer-focus:font-bold peer-focus:uppercase peer-focus:tracking-[0.08em] peer-focus:text-ink";
// Selects always show a value, so their label stays up.
const fixedLabel = "pointer-events-none absolute left-4 top-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-muted";

const fields = [
  { id: "name", label: "Your name", type: "text", auto: "name", mode: "text" },
  { id: "phone", label: "WhatsApp number", type: "tel", auto: "tel", mode: "tel" },
  { id: "email", label: "Email", type: "email", auto: "email", mode: "email" },
  { id: "college", label: "College", type: "text", auto: "organization", mode: "text" },
] as const;

const selects = [
  { id: "year", label: "Passing year", options: PASSING_YEARS },
  { id: "role", label: "Line you want", options: ROLES },
] as const;

function Error({ id, text }: { id: string; text?: string }) {
  return text ? <p id={`cs-${id}-error`} className="mt-1.5 text-xs font-medium text-error">{text}</p> : null;
}

export function CounselingForm() {
  const [errors, setErrors] = useState<CounselingErrors>({});
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ firstName: string; community: string | null } | null>(null);

  if (done) {
    return (
      <div className="cs-done flex min-h-[26rem] flex-col items-center justify-center py-6 text-center" role="status">
        <div aria-hidden="true" className="grid size-16 place-items-center rounded-full bg-red-strong text-white shadow-float">
          <Check className="size-8" strokeWidth={3} />
        </div>
        <h2 className="display mt-5 text-3xl">{done.firstName ? `You're in, ${done.firstName}.` : "You're in."}</h2>
        <p className="mx-auto mt-2 max-w-xs text-[15px] text-muted">
          We&apos;ll WhatsApp you soon to fix a time for your one-on-one call.
        </p>
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
        const f = new FormData(e.currentTarget);
        setBusy(true);
        setMessage("");
        const r = await submitCounseling(
          {
            name: f.get("name"),
            phone: f.get("phone"),
            email: f.get("email"),
            college: f.get("college"),
            year: f.get("year"),
            role: f.get("role"),
            question: f.get("question"),
          },
          String(f.get("website") ?? ""),
        ).catch((): CounselingResult => ({ ok: false, message: "Something went wrong. Check your connection and try again." }));
        setBusy(false);
        if (r.ok) return setDone({ firstName: r.firstName, community: r.community });
        setErrors(r.errors ?? {});
        setMessage(r.message ?? "");
      }}
      // An error goes as soon as its field is edited (selects fire input too), not on the next send.
      onInput={(e) => {
        const name = (e.target as HTMLInputElement).name as keyof CounselingErrors;
        if (errors[name]) setErrors((x) => ({ ...x, [name]: undefined }));
      }}
      className="flex flex-col gap-3"
    >
      <div className="mb-2">
        <h2 className="display text-3xl">Book your free call.</h2>
        <p className="mt-1 text-sm text-muted">One-on-one. No fee, no sales pitch.</p>
      </div>

      {/* Hidden from people; bots fill it in. */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 opacity-0" />

      {fields.map((f) => (
        <div key={f.id}>
          <div className="relative">
            <input
              id={`cs-${f.id}`}
              name={f.id}
              type={f.type}
              inputMode={f.mode}
              autoComplete={f.auto}
              autoCapitalize={f.type === "email" ? "none" : undefined}
              spellCheck={f.id === "name" ? undefined : false}
              placeholder={f.label}
              aria-invalid={!!errors[f.id]}
              aria-describedby={errors[f.id] ? `cs-${f.id}-error` : undefined}
              className={clsx(input, errors[f.id] ? bad : ok)}
            />
            <label htmlFor={`cs-${f.id}`} className={label}>{f.label}</label>
          </div>
          <Error id={f.id} text={errors[f.id]} />
        </div>
      ))}

      <div className="grid gap-3 sm:grid-cols-[2fr_3fr]">
        {selects.map((s) => (
          <div key={s.id}>
            <div className="relative">
              <select
                id={`cs-${s.id}`}
                name={s.id}
                defaultValue=""
                aria-invalid={!!errors[s.id]}
                aria-describedby={errors[s.id] ? `cs-${s.id}-error` : undefined}
                className={clsx(input, errors[s.id] ? bad : ok, "cursor-pointer appearance-none pr-10")}
              >
                <option value="" disabled>Choose</option>
                {s.options.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
              <label htmlFor={`cs-${s.id}`} className={fixedLabel}>{s.label}</label>
              <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
            </div>
            <Error id={s.id} text={errors[s.id]} />
          </div>
        ))}
      </div>

      <div className="relative">
        <textarea
          id="cs-question"
          name="question"
          rows={3}
          maxLength={600}
          placeholder="What do you want to ask? (optional)"
          className={clsx(input, ok, "resize-none")}
        />
        <label htmlFor="cs-question" className={label}>What do you want to ask? (optional)</label>
      </div>

      {message && <p role="alert" className="rounded-xl bg-error-tint px-4 py-3 text-sm font-medium text-error">{message}</p>}

      <button
        type="submit"
        disabled={busy}
        className="group mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-red-strong px-5 py-4 text-base font-bold text-white transition-[background-color,transform] duration-150 hover:bg-red-press active:scale-[0.98] disabled:opacity-60"
      >
        {busy ? "Sending…" : "Book my free session"}
        {!busy && <ArrowRight aria-hidden="true" className="size-4 transition-transform duration-200 group-hover:translate-x-1" />}
      </button>
    </form>
  );
}
