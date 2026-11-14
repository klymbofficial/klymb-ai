"use client";

import clsx from "clsx";
import { useState } from "react";
import { submitJoin, type JoinResult } from "@/app/(register)/join/actions";
import { EXPERIENCE, STATUSES, YEARS, type JoinErrors, type Status } from "@/lib/join";

// 16px text: anything smaller makes iPhones zoom the page when a field is tapped.
const input =
  "mt-1.5 block w-full rounded-xl border bg-surface/40 px-4 py-3 text-base text-ink transition-[border-color,box-shadow,background-color] duration-200 placeholder:text-muted/60 focus:bg-white focus:outline-none focus-visible:outline-none";
const ok = "border-line/40 focus:border-ink/50 focus:ring-4 focus:ring-ink/5";
const bad = "border-error/60 focus:ring-4 focus:ring-error/10";

function Err({ id, msg }: { id: string; msg?: string }) {
  return msg ? <p id={`${id}-error`} className="mt-1.5 text-xs font-medium text-error">{msg}</p> : null;
}

function Chips({ name, options, value, onPick, error }: { name: string; options: readonly { key: string; label: string }[]; value: string; onPick: (v: string) => void; error?: string }) {
  return (
    <div role="radiogroup" aria-label={name} aria-describedby={error ? `${name}-error` : undefined} className="mt-2 flex flex-wrap gap-2">
      {options.map((o) => {
        const on = value === o.key;
        return (
          <button
            key={o.key}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onPick(o.key)}
            className={clsx(
              "rounded-full border px-4 py-2 text-sm font-semibold transition-[background-color,color,border-color,transform] duration-150 active:scale-[0.97]",
              on ? "border-ink bg-ink text-paper" : error ? "border-error/50 bg-white text-ink" : "border-line/40 bg-white text-ink hover:border-ink/40",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function JoinForm({ from }: { from: string }) {
  const [status, setStatus] = useState<Status | "">("");
  const [level, setLevel] = useState("");
  const [errors, setErrors] = useState<JoinErrors>({});
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  if (done !== null) {
    return (
      <div className="py-6 text-center" role="status">
        <div aria-hidden="true" className="mx-auto grid size-16 place-items-center rounded-full bg-emerald-50 text-3xl ring-1 ring-emerald-200">✓</div>
        <h2 className="display mt-5 text-3xl">{done ? `Done, ${done}!` : "Done!"}</h2>
        <p className="mx-auto mt-3 max-w-sm text-[15px] leading-relaxed text-muted">
          We&apos;ll WhatsApp you the course details soon. Keep an eye on your chats.
        </p>
        <p className="mt-6 text-sm text-muted">{/^(ig|insta|story)/i.test(from) ? "You can close this page and go back to Instagram." : "You can close this page now."}</p>
      </div>
    );
  }

  const levels = status === "working" ? EXPERIENCE : YEARS;

  return (
    <form
      noValidate
      onSubmit={async (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        setBusy(true);
        setMessage("");
        const r = await submitJoin(
          { name: f.get("name"), phone: f.get("phone"), email: f.get("email"), org: f.get("org"), status, level, from },
          String(f.get("website") ?? ""),
        ).catch((): JoinResult => ({ ok: false, message: "Something went wrong. Check your connection and try again." }));
        setBusy(false);
        if (r.ok) return setDone(r.firstName);
        setErrors(r.errors ?? {});
        setMessage(r.message ?? (r.errors ? "A couple of things to fix above." : ""));
      }}
      // An error goes as soon as its field is edited, not on the next send.
      onInput={(e) => {
        const name = (e.target as HTMLInputElement).name as keyof JoinErrors;
        if (errors[name]) setErrors((x) => ({ ...x, [name]: undefined }));
      }}
      className="flex flex-col gap-5"
    >
      <div>
        <h2 className="display text-2xl sm:text-3xl">Get the details</h2>
        <p className="mt-1 text-sm text-muted">Takes 30 seconds. We only use this to message you about the course.</p>
      </div>

      {/* Hidden from people; bots fill it in. */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 opacity-0" />

      <div>
        <label htmlFor="name" className="text-[13px] font-bold">Your name</label>
        <input id="name" name="name" autoComplete="name" placeholder="Rohan Sharma" aria-invalid={!!errors.name} aria-describedby={errors.name ? "name-error" : undefined} className={clsx(input, errors.name ? bad : ok)} />
        <Err id="name" msg={errors.name} />
      </div>

      <div>
        <label htmlFor="phone" className="text-[13px] font-bold">WhatsApp number</label>
        <input id="phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="98765 43210" aria-invalid={!!errors.phone} aria-describedby={errors.phone ? "phone-error" : undefined} className={clsx(input, errors.phone ? bad : ok)} />
        <Err id="phone" msg={errors.phone} />
      </div>

      <div>
        <label htmlFor="email" className="text-[13px] font-bold">Email</label>
        <input id="email" name="email" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" spellCheck={false} placeholder="you@gmail.com" aria-invalid={!!errors.email} aria-describedby={errors.email ? "email-error" : undefined} className={clsx(input, errors.email ? bad : ok)} />
        <Err id="email" msg={errors.email} />
      </div>

      <div>
        <p className="text-[13px] font-bold">You are</p>
        <Chips name="status" options={STATUSES} value={status} error={errors.status} onPick={(v) => { setStatus(v as Status); setLevel(""); setErrors((e) => ({ ...e, status: undefined })); }} />
        <Err id="status" msg={errors.status} />
      </div>

      {status && (
        <>
          <div>
            <label htmlFor="org" className="text-[13px] font-bold">{status === "working" ? "Company" : "College"}</label>
            <input
              key={status}
              id="org"
              name="org"
              autoComplete={status === "working" ? "organization" : "off"}
              placeholder={status === "working" ? "TCS, Swiggy, a startup…" : "VIT, DTU, LPU…"}
              aria-invalid={!!errors.org}
              aria-describedby={errors.org ? "org-error" : undefined}
              className={clsx(input, errors.org ? bad : ok)}
            />
            <Err id="org" msg={errors.org} />
          </div>
          <div>
            <p className="text-[13px] font-bold">{status === "working" ? "Experience" : "Year"}</p>
            <Chips name="level" options={levels.map((l) => ({ key: l, label: l }))} value={level} error={errors.level} onPick={(v) => { setLevel(v); setErrors((e) => ({ ...e, level: undefined })); }} />
            <Err id="level" msg={errors.level} />
          </div>
        </>
      )}

      {message && <p role="alert" className="rounded-xl bg-error-tint px-4 py-3 text-sm font-medium text-error">{message}</p>}

      <button
        type="submit"
        disabled={busy}
        className="mt-1 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-red-strong px-5 py-4 text-base font-bold text-white transition-[background-color,transform] duration-150 hover:bg-red-press active:scale-[0.98] disabled:opacity-60"
      >
        {busy ? "Sending…" : "Send me the details"}
        {!busy && <span aria-hidden="true">→</span>}
      </button>
    </form>
  );
}
