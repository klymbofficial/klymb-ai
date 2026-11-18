"use client";

import clsx from "clsx";
import { ArrowRight, Briefcase, CalendarPlus, Check, ChevronDown, GraduationCap } from "lucide-react";
import { useEffect, useState } from "react";
import { DIAL_CODES, INDIA_DIAL, countdownParts, phoneProblem, type SdRole } from "@/lib/sd-offer";
import { WEBINAR, WEBINAR_LIMITS, googleCalendarLink, webinarProblems, webinarStart } from "@/lib/webinar";

const pad = (n: number) => String(n).padStart(2, "0");

const ROLES: { key: SdRole; label: string; Icon: typeof Briefcase }[] = [
  { key: "student", label: "Student", Icon: GraduationCap },
  { key: "working", label: "Working professional", Icon: Briefcase },
];

/** Time to the start, from the server's clock first so the first paint matches. Gone once it starts. */
function Countdown({ serverNow }: { serverNow: number }) {
  const [now, setNow] = useState(serverNow);
  useEffect(() => {
    const iv = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(iv);
  }, []);
  const left = webinarStart() - now;
  if (left <= 0) return <span className="text-sm font-extrabold text-[#f3d48a]">Live now</span>;
  const { days, hours, minutes, seconds } = countdownParts(left);
  const cells: [number, string][] = [[days, "days"], [hours, "hrs"], [minutes, "min"], [seconds, "sec"]];
  return (
    <div role="timer" aria-label={`Starts in ${days} days ${hours} hours`} className="flex gap-1.5">
      {cells.map(([value, label]) => (
        <div key={label} className="flex min-w-[46px] flex-col items-center rounded-lg border border-[rgba(231,201,122,.3)] bg-black/30 px-1 py-1.5">
          <span className="text-lg leading-none font-extrabold tabular-nums">{pad(value)}</span>
          <span className="text-[10px] font-bold tracking-[.08em] text-[#e7c97a] uppercase">{label}</span>
        </div>
      ))}
    </div>
  );
}

/** The card: when it is, the countdown, and the form; after sending, the WhatsApp group and calendar. */
export function WebinarCard({ open, serverNow }: { open: boolean; serverNow: number }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [dial, setDial] = useState(INDIA_DIAL);
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<SdRole | "">("");
  const [org, setOrg] = useState("");
  const [question, setQuestion] = useState("");
  const [website, setWebsite] = useState("");
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<{ group: string; emailed: boolean } | null>(null);

  const missing = webinarProblems({ name, email, dial, phone, role });
  const bad = (what: string) => tried && missing.includes(what);
  const india = dial === INDIA_DIAL;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (missing.length) return setTried(true);
    setBusy(true);
    const res = await fetch("/api/webinar/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, dial, phone, role, org, question, website }),
    }).catch(() => null);
    const out = await res?.json().catch(() => null);
    setBusy(false);
    if (res?.ok && out?.ok) return setDone({ group: out.group ?? WEBINAR.whatsappGroup, emailed: out.emailed === true });
    setError(out?.error ?? "We couldn't save that. Check your connection and try again.");
  }

  const input = "min-h-[50px] w-full rounded-[10px] border bg-[#eae9e9] px-2.5 py-1.5 text-base text-ink caret-[#83050b] outline-none focus-visible:border-[#83050b]";
  const label = "text-[13px] font-bold";
  const border = (wrong: boolean) => (wrong ? "border-[#83050b]" : "border-transparent");

  return (
    <div className="relative">
      <div aria-hidden="true" className="absolute -inset-px rounded-[22px] bg-[linear-gradient(140deg,#e7c97a,rgba(231,201,122,.1)_40%,#83050b_100%)] opacity-90" />
      <div className="relative overflow-hidden rounded-[20px] bg-[#f6efe4] text-ink shadow-[0_30px_80px_-20px_rgba(0,0,0,.6),0_0_0_1px_rgba(0,0,0,.05)]">
        <div className="relative overflow-hidden bg-[#83050b] p-[18px] text-[#fbf6ee] lg:px-6 lg:py-[22px]">
          <div aria-hidden="true" className="absolute -top-10 -right-10 size-[180px] rounded-full bg-[radial-gradient(circle,rgba(231,201,122,.55),transparent_65%)]" />
          <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,#e7c97a_1.2px,transparent_1.6px)] [background-size:16px_16px] opacity-[.18]" />
          <div className="relative flex flex-col gap-1">
            <span className="text-[11px] font-extrabold tracking-[.12em] text-[#f3d48a] uppercase">Free · Live on Google Meet</span>
            <span className="text-[30px] leading-[1] font-extrabold tracking-[-.04em] lg:text-[34px]">Sat, 21 Nov</span>
            <span className="text-[15px] font-bold text-[rgba(251,246,238,.85)]">{WEBINAR.timeLabel}</span>
          </div>
          {open && (
            <div className="relative mt-4 flex flex-wrap items-center gap-2.5">
              <span className="text-xs font-bold text-[#f3d48a]">Starts in</span>
              <Countdown serverNow={serverNow} />
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3.5 p-[18px] lg:p-6 lg:pb-[22px]">
          {!open ? (
            <p role="status" className="m-0 text-[15px] leading-[1.5]">This webinar has ended, so registration is closed. Follow Klymb.ai to hear about the next one.</p>
          ) : done ? (
            <div role="status" className="flex flex-col gap-3">
              <span className="flex size-11 items-center justify-center rounded-full bg-[#2f6b2f] text-white"><Check size={24} aria-hidden="true" /></span>
              <h2 className="m-0 text-2xl leading-[1.1] font-extrabold tracking-[-.03em]">You&apos;re registered.</h2>
              <p className="m-0 text-[15px] leading-[1.5] text-pretty">Join the WhatsApp group now: the Google Meet link is shared there, and by email, on the day.{done.emailed && " We've also emailed you a confirmation."}</p>
              <a href={done.group} target="_blank" rel="noopener noreferrer" className="flex h-[58px] items-center justify-between rounded-xl bg-[#1f7a43] px-5 text-[17px] font-extrabold text-white no-underline shadow-[0_10px_24px_-8px_rgba(31,122,67,.7)] hover:bg-[#186537]">
                Join the WhatsApp group<ArrowRight size={20} aria-hidden="true" />
              </a>
              <a href={googleCalendarLink()} target="_blank" rel="noopener noreferrer" className="flex min-h-[50px] items-center justify-center gap-2 rounded-xl border-2 border-[#83050b] px-4 text-[15px] font-extrabold text-[#83050b] no-underline">
                <CalendarPlus size={18} aria-hidden="true" />Add to Google Calendar
              </a>
            </div>
          ) : (
            <form onSubmit={submit} noValidate className="flex flex-col gap-3.5">
              <h2 className="m-0 text-xl leading-[1.15] font-extrabold tracking-[-.02em]">Save your seat</h2>
              <label className="flex min-w-0 flex-col gap-1.5">
                <span className={label}>Full name</span>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Aarav Sharma" autoComplete="name" maxLength={WEBINAR_LIMITS.name} aria-invalid={bad("your name")} className={clsx(input, border(bad("your name")))} />
              </label>
              <label className="flex min-w-0 flex-col gap-1.5">
                <span className={label}>Email</span>
                <input type="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" autoCapitalize="none" spellCheck={false} maxLength={254} aria-invalid={bad("a valid email")} className={clsx(input, border(bad("a valid email")))} />
              </label>
              <div className="flex min-w-0 flex-col gap-1.5">
                <label htmlFor="webinar-phone" className={label}>WhatsApp number</label>
                <div className="flex gap-2">
                  {/* The list names each country; the closed box shows just the flag and code, so it stays narrow. */}
                  <div className="relative w-[96px] flex-none">
                    <select value={dial} onChange={(e) => setDial(e.target.value)} aria-label="Country code" autoComplete="tel-country-code" className={clsx(input, "cursor-pointer appearance-none border-transparent text-transparent")}>
                      {DIAL_CODES.map((c) => <option key={c.dial} value={c.dial} className="text-ink">{`${c.flag} ${c.name} (+${c.dial})`}</option>)}
                    </select>
                    <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-2.5 flex items-center gap-1 font-bold text-[#605d5d]">
                      {DIAL_CODES.find((c) => c.dial === dial)?.flag} +{dial}
                      <ChevronDown size={14} />
                    </span>
                  </div>
                  <input id="webinar-phone" type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={india ? "98765 43210" : "Phone number"} autoComplete="tel-national" maxLength={20} aria-invalid={bad(phoneProblem(dial))} className={clsx(input, "min-w-0", border(bad(phoneProblem(dial))))} />
                </div>
              </div>
              <div role="radiogroup" aria-label="I am a" className="flex flex-col gap-1.5">
                <span className={label}>I am a</span>
                <div className="grid grid-cols-2 gap-2">
                  {ROLES.map(({ key, label: text, Icon }) => {
                    const on = role === key;
                    return (
                      <button
                        key={key} type="button" role="radio" aria-checked={on} aria-label={text} onClick={() => setRole(key)}
                        className={clsx(
                          "flex cursor-pointer flex-col items-start gap-1.5 rounded-xl border-2 p-3 text-left text-ink transition-[border-color,background-color,transform] duration-200 active:scale-[.98]",
                          on ? "border-[#83050b] bg-white" : tried && !role ? "border-[#f0868b] bg-white/55" : "border-[rgba(32,30,29,.14)] bg-white/55",
                        )}
                      >
                        <span className={clsx("flex w-full items-center justify-between", on ? "text-[#83050b]" : "text-[#605d5d]")}>
                          <Icon size={24} aria-hidden="true" />
                          <span className={clsx("box-border size-[18px] rounded-full border-2", on ? "border-[#83050b] bg-[#83050b] shadow-[inset_0_0_0_3px_#fff]" : "border-[#bab6b6]")} />
                        </span>
                        <span className="text-[15px] leading-[1.2] font-extrabold">{text}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <label className="flex min-w-0 flex-col gap-1.5">
                <span className={label}>{role === "working" ? "Company" : role === "student" ? "College" : "College or company"} <span className="font-normal text-[#605d5d]">(optional)</span></span>
                <input type="text" value={org} onChange={(e) => setOrg(e.target.value)} placeholder={role === "working" ? "Where you work" : role === "student" ? "Where you study" : "Where you study or work"} autoComplete="organization" maxLength={WEBINAR_LIMITS.org} className={clsx(input, "border-transparent")} />
              </label>
              <label className="flex min-w-0 flex-col gap-1.5">
                <span className={label}>A question for the session <span className="font-normal text-[#605d5d]">(optional)</span></span>
                <textarea value={question} onChange={(e) => setQuestion(e.target.value)} rows={3} placeholder="What do you want answered live?" maxLength={WEBINAR_LIMITS.question} className={clsx(input, "resize-y border-transparent py-2.5")} />
              </label>
              {/* Left empty by people; bots fill it in. */}
              <input type="text" name="website" value={website} onChange={(e) => setWebsite(e.target.value)} tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute -left-[9999px] h-px w-px opacity-0" />
              {tried && missing.length > 0 && <p role="alert" className="m-0 text-[13px] font-semibold text-[#83050b]">Add {missing.join(", ")}.</p>}
              {error && <p role="alert" className="m-0 text-[13px] font-semibold text-[#83050b]">{error}</p>}
              <button type="submit" disabled={busy} className="relative flex h-[58px] cursor-pointer items-center justify-between overflow-hidden rounded-xl border-0 bg-[#83050b] px-5 text-[17px] font-extrabold text-[#fbf6ee] shadow-[0_10px_24px_-8px_rgba(131,5,11,.7)] hover:bg-[#690409] disabled:cursor-wait disabled:opacity-80">
                {busy ? "Saving your seat…" : "Register for free"}<ArrowRight size={20} aria-hidden="true" />
              </button>
              <p className="m-0 text-xs leading-[1.4] text-[#605d5d]">You&apos;ll get the WhatsApp group link right away. The Meet link comes on the day.</p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
