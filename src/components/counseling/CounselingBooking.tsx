"use client";

import clsx from "clsx";
import { ArrowLeft, ArrowRight, Check, MessagesSquare, Phone, UsersRound, X } from "lucide-react";
import { useRef, useState } from "react";
import { submitCounseling, type CounselingResult } from "@/app/(site)/counseling/actions";
import {
  PASSING_YEARS,
  ROLES,
  SLOT_HOURS,
  dayParts,
  hourLabel,
  indiaToday,
  slotDays,
  slotLabel,
  type CounselingErrors,
} from "@/lib/counseling";

/*
 * The /counseling booking, in the shape of a 1:1 booking page: service cards
 * that open a sheet. Step 1 picks a preferred evening slot, step 2 takes the
 * details, then the community invite. On phones the sheet rises from the
 * bottom and a booking bar stays along the bottom of the page.
 */

const services = [
  { icon: Phone, kind: "1:1 call", meta: "Phone or video", title: "Career clarity call", line: "Roles, resume, your first job. Ask anything.", tag: "Free" },
  { icon: UsersRound, kind: "Community", meta: "WhatsApp group", title: "Free IT community", line: "Meet professionals from your line.", tag: "Included" },
] as const;

// 16px text: anything smaller makes iPhones zoom the page when a field is tapped.
const input =
  "peer block w-full rounded-xl border bg-surface/40 px-4 pb-2.5 pt-6 text-base text-ink transition-[border-color,box-shadow,background-color] duration-200 placeholder:text-transparent focus:bg-white focus:outline-none focus-visible:outline-none";
const ok = "border-line/40 hover:border-line/70 focus:border-ink/50 focus:ring-4 focus:ring-ink/5";
const bad = "border-error/60 focus:ring-4 focus:ring-error/10";
const label =
  "pointer-events-none absolute left-4 top-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-muted transition-all duration-150 peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-placeholder-shown:font-medium peer-placeholder-shown:normal-case peer-placeholder-shown:tracking-normal peer-focus:top-1.5 peer-focus:text-[11px] peer-focus:font-bold peer-focus:uppercase peer-focus:tracking-[0.08em] peer-focus:text-ink";

const fields = [
  { id: "name", label: "Your name", type: "text", auto: "name", mode: "text" },
  { id: "phone", label: "WhatsApp number", type: "tel", auto: "tel", mode: "tel" },
  { id: "email", label: "Email", type: "email", auto: "email", mode: "email" },
  { id: "college", label: "College", type: "text", auto: "organization", mode: "text" },
] as const;

/** A tappable choice: a radio styled as a chip, so the whole group is one tab stop with arrow keys. */
function Chip({ name, value, children, onPick, className }: { name: string; value: string; children: React.ReactNode; onPick?: () => void; className?: string }) {
  return (
    <label className={clsx("cs-chip", className)}>
      <input type="radio" name={name} value={value} onChange={onPick} className="sr-only" />
      <span>{children}</span>
    </label>
  );
}

function FieldError({ id, text }: { id: string; text?: string }) {
  return text ? <p id={`cs-${id}-error`} className="mt-1.5 text-xs font-medium text-error">{text}</p> : null;
}

export function CounselingBooking() {
  const sheet = useRef<HTMLDialogElement>(null);
  const [step, setStep] = useState<1 | 2>(1);
  const [days, setDays] = useState<string[]>([]);
  const [day, setDay] = useState("");
  const [hour, setHour] = useState(0);
  const [errors, setErrors] = useState<CounselingErrors>({});
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ firstName: string; community: string | null } | null>(null);

  const open = () => {
    // The days are worked out on opening, not while rendering, so the server and the phone never disagree.
    if (!days.length) setDays(slotDays(indiaToday()));
    sheet.current?.showModal();
  };
  const close = () => sheet.current?.close();

  return (
    <>
      <ul className="grid gap-3" aria-label="Sessions">
        {services.map((s) => (
          <li key={s.title}>
            <button type="button" onClick={open} className="cs-service group w-full rounded-card bg-card p-5 text-left">
              <span className="flex items-center gap-2 text-sm text-muted">
                <s.icon aria-hidden="true" className="size-4" />
                {s.kind} · {s.meta}
              </span>
              <span className="mt-2 block font-heading text-xl font-bold leading-tight">{s.title}</span>
              <span className="mt-1 block text-[15px] text-muted">{s.line}</span>
              <span className="mt-4 flex items-center justify-between border-t border-line/20 pt-4">
                <span className="rounded-full bg-red-tint px-3 py-1 text-sm font-extrabold text-red-strong">{s.tag}</span>
                <span aria-hidden="true" className="grid size-10 place-items-center rounded-full bg-ink text-white transition-transform duration-200 group-hover:translate-x-1">
                  <ArrowRight className="size-5" />
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>

      {/* Phones: the booking bar along the bottom, as on 1:1 booking pages. */}
      <div className="cs-bar fixed inset-x-0 bottom-0 z-40 flex items-center justify-between gap-3 border-t border-line/20 bg-card/95 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur lg:hidden">
        <div className="leading-tight">
          <p className="text-xs text-muted">Free · evenings</p>
          <p className="font-bold">5 PM – 9 PM</p>
        </div>
        <button type="button" onClick={open} className="rounded-xl bg-ink px-6 py-3 font-bold text-white active:scale-[0.98]">
          Book free call
        </button>
      </div>

      <dialog
        ref={sheet}
        aria-labelledby="cs-sheet-title"
        className="cs-sheet bg-card text-ink"
        // A tap on the dimmed backdrop closes it.
        onClick={(e) => e.target === e.currentTarget && close()}
      >
        <div className="flex max-h-[inherit] flex-col">
          <header className="flex items-center gap-2 border-b border-line/20 px-4 py-3">
            {step === 2 && !done ? (
              <button type="button" onClick={() => setStep(1)} aria-label="Back to the time" className="grid size-9 place-items-center rounded-full hover:bg-surface">
                <ArrowLeft className="size-5" />
              </button>
            ) : (
              <span aria-hidden="true" className="grid size-9 place-items-center rounded-full bg-red-tint text-red-strong">
                <MessagesSquare className="size-4" />
              </span>
            )}
            <div className="min-w-0 flex-1 leading-tight">
              <p id="cs-sheet-title" className="font-bold">Career clarity call</p>
              <p className="text-xs text-muted">1:1 · Free · {done ? "Booked" : `Step ${step} of 2`}</p>
            </div>
            <button type="button" onClick={close} aria-label="Close" className="grid size-9 place-items-center rounded-full hover:bg-surface">
              <X className="size-5" />
            </button>
          </header>

          {done ? (
            <div className="cs-done flex flex-col items-center px-6 pb-8 pt-8 text-center" role="status">
              <div aria-hidden="true" className="grid size-16 place-items-center rounded-full bg-red-strong text-white shadow-float">
                <Check className="size-8" strokeWidth={3} />
              </div>
              <h2 className="display mt-5 text-3xl">{done.firstName ? `You're in, ${done.firstName}.` : "You're in."}</h2>
              <p className="mt-2 rounded-full bg-surface px-3 py-1 text-sm font-semibold">{slotLabel(day, hour)}</p>
              <p className="mx-auto mt-3 max-w-xs text-[15px] text-muted">Our team will WhatsApp you to confirm.</p>
              {done.community && (
                <a
                  href={done.community}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#1f8f4e] px-5 py-4 text-base font-bold text-white transition-[background-color,transform] duration-150 hover:bg-[#187540] active:scale-[0.98]"
                >
                  <UsersRound aria-hidden="true" className="size-5" />
                  Join the free community
                </a>
              )}
            </div>
          ) : (
            <form
              noValidate
              className="flex min-h-0 flex-1 flex-col"
              onSubmit={async (e) => {
                e.preventDefault();
                if (step === 1) return day && hour ? setStep(2) : undefined;
                const form = e.currentTarget;
                const f = new FormData(form);
                setBusy(true);
                setMessage("");
                const r = await submitCounseling(
                  {
                    day,
                    hour,
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
                const errs = r.errors ?? {};
                setErrors(errs);
                setMessage(r.message ?? "");
                // On a phone the first problem may be below the fold: bring it into view.
                requestAnimationFrame(() => form.querySelector("[id$='-error'], [role=alert]")?.scrollIntoView({ block: "center", behavior: "smooth" }));
                // A day that has since passed (the page was left open overnight): back to picking one.
                if (errs.day || errs.hour) {
                  setDays(slotDays(indiaToday()));
                  setDay("");
                  setStep(1);
                }
              }}
              onInput={(e) => {
                const name = (e.target as HTMLInputElement).name as keyof CounselingErrors;
                if (errors[name]) setErrors((x) => ({ ...x, [name]: undefined }));
              }}
            >
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5">
                {/* Hidden from people; bots fill it in. */}
                <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 opacity-0" />

                <div hidden={step !== 1}>
                  <h2 className="text-lg font-bold">When should we call?</h2>
                  {(errors.day || errors.hour) && <p role="alert" className="mt-1 text-sm font-medium text-error">That day has passed. Pick a new one.</p>}
                  <fieldset className="mt-3">
                    <legend className="sr-only">Day</legend>
                    <div className="cs-days -mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
                      {days.map((d) => {
                        const p = dayParts(d);
                        return (
                          <Chip key={d} name="day" value={d} onPick={() => setDay(d)} className="cs-chip-day">
                            <span className="block text-sm">{p.weekday}</span>
                            <span className="block font-bold">{p.date}</span>
                          </Chip>
                        );
                      })}
                    </div>
                  </fieldset>
                  <fieldset className="mt-6">
                    <legend className="text-lg font-bold">Pick a time <span className="text-sm font-medium text-muted">(IST)</span></legend>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      {SLOT_HOURS.map((h) => (
                        <Chip key={h} name="hour" value={String(h)} onPick={() => setHour(h)}>
                          {hourLabel(h)} – {hourLabel(h + 1)}
                        </Chip>
                      ))}
                    </div>
                  </fieldset>
                  <p className="mt-5 rounded-xl bg-surface/60 px-4 py-3 text-sm text-muted">Our team will WhatsApp you to confirm the time.</p>
                </div>

                <div hidden={step !== 2} className="grid gap-3">
                  {day && hour > 0 && (
                    <button type="button" onClick={() => setStep(1)} className="flex items-center justify-between rounded-xl bg-red-tint px-4 py-3 text-left text-sm">
                      <span className="font-bold text-red-strong">{slotLabel(day, hour)}</span>
                      <span className="font-semibold text-red-strong underline underline-offset-2">Change</span>
                    </button>
                  )}

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
                      <FieldError id={f.id} text={errors[f.id]} />
                    </div>
                  ))}

                  <fieldset className="mt-2" aria-describedby={errors.year ? "cs-year-error" : undefined}>
                    <legend className="text-sm font-bold">Passing year</legend>
                    <div className="mt-2 grid grid-cols-4 gap-2">
                      {PASSING_YEARS.map((y) => <Chip key={y} name="year" value={y}>{y}</Chip>)}
                    </div>
                    <FieldError id="year" text={errors.year} />
                  </fieldset>

                  <fieldset className="mt-2" aria-describedby={errors.role ? "cs-role-error" : undefined}>
                    <legend className="text-sm font-bold">The line you want</legend>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {ROLES.map((r) => <Chip key={r} name="role" value={r} className="cs-chip-pill">{r}</Chip>)}
                    </div>
                    <FieldError id="role" text={errors.role} />
                  </fieldset>

                  <div className="relative mt-2">
                    <textarea id="cs-question" name="question" rows={2} maxLength={600} placeholder="Anything to ask? (optional)" className={clsx(input, ok, "resize-none")} />
                    <label htmlFor="cs-question" className={label}>Anything to ask? (optional)</label>
                  </div>

                  {message && <p role="alert" className="rounded-xl bg-error-tint px-4 py-3 text-sm font-medium text-error">{message}</p>}
                </div>
              </div>

              <div className="border-t border-line/20 px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3">
                <button
                  type="submit"
                  disabled={busy || (step === 1 && !(day && hour))}
                  className="group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-ink px-5 py-4 text-base font-bold text-white transition-[background-color,transform,opacity] duration-150 hover:bg-ink/90 active:scale-[0.98] disabled:opacity-40"
                >
                  {busy ? "Booking…" : step === 1 ? "Continue" : "Book free call"}
                  {!busy && <ArrowRight aria-hidden="true" className="size-4 transition-transform duration-200 group-hover:translate-x-1" />}
                </button>
              </div>
            </form>
          )}
        </div>
      </dialog>
    </>
  );
}
