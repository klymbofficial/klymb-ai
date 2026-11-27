"use client";

import clsx from "clsx";
import { ArrowRight, Check } from "lucide-react";
import { useState } from "react";
import { submitOrgEnquiry, type OrgEnquiryResult } from "@/app/(site)/organizations/actions";
import type { OrgEnquiryErrors } from "@/lib/org-enquiry";

// 16px text: anything smaller makes iPhones zoom the page when a field is tapped.
const input =
  "peer block w-full rounded-xl border bg-surface/40 px-4 pb-2.5 pt-6 text-base text-ink transition-[border-color,box-shadow,background-color] duration-200 placeholder:text-transparent focus:bg-white focus:outline-none focus-visible:outline-none";
const ok = "border-line/40 hover:border-line/70 focus:border-ink/50 focus:ring-4 focus:ring-ink/5";
const bad = "border-error/60 focus:ring-4 focus:ring-error/10";
// The label sits inside the field and slides up once there is something in it.
const label =
  "pointer-events-none absolute left-4 top-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-muted transition-all duration-150 peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-placeholder-shown:font-medium peer-placeholder-shown:normal-case peer-placeholder-shown:tracking-normal peer-focus:top-1.5 peer-focus:text-[11px] peer-focus:font-bold peer-focus:uppercase peer-focus:tracking-[0.08em] peer-focus:text-ink";

const fields = [
  { id: "name", label: "Your name", type: "text", auto: "name", mode: "text" },
  { id: "email", label: "Work email", type: "email", auto: "email", mode: "email" },
  { id: "org", label: "Organization", type: "text", auto: "organization", mode: "text" },
  { id: "phone", label: "Phone number", type: "tel", auto: "tel", mode: "tel" },
] as const;

export function OrgEnquiryForm() {
  const [errors, setErrors] = useState<OrgEnquiryErrors>({});
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  if (done !== null) {
    return (
      <div className="org-done flex min-h-[22rem] flex-col items-center justify-center py-6 text-center" role="status">
        <div aria-hidden="true" className="grid size-16 place-items-center rounded-full bg-red-strong text-white shadow-float">
          <Check className="size-8" strokeWidth={3} />
        </div>
        <h2 className="display mt-5 text-3xl">{done ? `Thanks, ${done}.` : "Thanks."}</h2>
        <p className="mx-auto mt-2 max-w-xs text-[15px] text-muted">We&apos;ll call you soon to set things up.</p>
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
        const r = await submitOrgEnquiry(
          { name: f.get("name"), email: f.get("email"), org: f.get("org"), phone: f.get("phone") },
          String(f.get("website") ?? ""),
        ).catch((): OrgEnquiryResult => ({ ok: false, message: "Something went wrong. Check your connection and try again." }));
        setBusy(false);
        if (r.ok) return setDone(r.firstName);
        setErrors(r.errors ?? {});
        setMessage(r.message ?? "");
      }}
      // An error goes as soon as its field is edited, not on the next send.
      onInput={(e) => {
        const name = (e.target as HTMLInputElement).name as keyof OrgEnquiryErrors;
        if (errors[name]) setErrors((x) => ({ ...x, [name]: undefined }));
      }}
      className="flex flex-col gap-3"
    >
      <h2 className="display mb-2 text-3xl">Let&apos;s talk.</h2>

      {/* Hidden from people; bots fill it in. */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 opacity-0" />

      {fields.map((f) => (
        <div key={f.id}>
          <div className="relative">
            <input
              id={`org-${f.id}`}
              name={f.id}
              type={f.type}
              inputMode={f.mode}
              autoComplete={f.auto}
              autoCapitalize={f.type === "email" ? "none" : undefined}
              spellCheck={f.type === "text" && f.id !== "org" ? undefined : false}
              placeholder={f.label}
              aria-invalid={!!errors[f.id]}
              aria-describedby={errors[f.id] ? `org-${f.id}-error` : undefined}
              className={clsx(input, errors[f.id] ? bad : ok)}
            />
            <label htmlFor={`org-${f.id}`} className={label}>{f.label}</label>
          </div>
          {errors[f.id] && <p id={`org-${f.id}-error`} className="mt-1.5 text-xs font-medium text-error">{errors[f.id]}</p>}
        </div>
      ))}

      {message && <p role="alert" className="rounded-xl bg-error-tint px-4 py-3 text-sm font-medium text-error">{message}</p>}

      <button
        type="submit"
        disabled={busy}
        className="group mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-red-strong px-5 py-4 text-base font-bold text-white transition-[background-color,transform] duration-150 hover:bg-red-press active:scale-[0.98] disabled:opacity-60"
      >
        {busy ? "Sending…" : "Get a call back"}
        {!busy && <ArrowRight aria-hidden="true" className="size-4 transition-transform duration-200 group-hover:translate-x-1" />}
      </button>
    </form>
  );
}
