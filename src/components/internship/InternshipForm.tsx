"use client";

import clsx from "clsx";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { HOURS, INTERNSHIP, INTERNSHIP_LIMITS, internshipProblems, type Hours } from "@/lib/internship";
import { DIAL_CODES, INDIA_DIAL, phoneProblem, type SdRole } from "@/lib/sd-offer";

// 16px text: anything smaller makes iPhones zoom the page when a field is tapped. Same fields as /webinar.
const input =
  "mt-1.5 block w-full rounded-xl border bg-surface/40 px-4 py-3 text-base text-ink transition-[border-color,box-shadow,background-color] duration-200 placeholder:text-muted/60 focus:bg-white focus:outline-none focus-visible:outline-none";
const ok = "border-line/40 focus:border-ink/50 focus:ring-4 focus:ring-ink/5";
const bad = "border-error/60 focus:ring-4 focus:ring-error/10";
const optional = <span className="font-normal text-muted">(optional)</span>;

const ROLES: { key: SdRole; label: string }[] = [
  { key: "student", label: "Student" },
  { key: "working", label: "Working professional" },
];

function Pills<T extends string>({ label, value, options, onPick, invalid }: { label: string; value: T | ""; options: readonly { key: T; label: string }[]; onPick: (v: T) => void; invalid: boolean }) {
  return (
    <div>
      <p className="text-[13px] font-bold">{label}</p>
      <div role="radiogroup" aria-label={label} className="mt-2 flex flex-wrap gap-2">
        {options.map((o) => {
          const on = value === o.key;
          return (
            <button
              key={o.key} type="button" role="radio" aria-checked={on} onClick={() => onPick(o.key)}
              className={clsx(
                "rounded-full border px-4 py-2 text-sm font-semibold transition-[background-color,color,border-color,transform] duration-150 active:scale-[0.97]",
                on ? "border-ink bg-ink text-paper" : invalid ? "border-error/50 bg-white text-ink" : "border-line/40 bg-white text-ink hover:border-ink/40",
              )}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** The application, in /webinar's style. After sending, what happens next. */
export function InternshipForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [dial, setDial] = useState(INDIA_DIAL);
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [role, setRole] = useState<SdRole | "">("");
  const [org, setOrg] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [instagram, setInstagram] = useState("");
  const [hours, setHours] = useState<Hours | "">("");
  const [experience, setExperience] = useState("");
  const [why, setWhy] = useState("");
  const [website, setWebsite] = useState("");
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<{ emailed: boolean } | null>(null);

  const missing = internshipProblems({ name, email, dial, phone, role, hours, why, linkedin });
  const wrong = (what: string) => tried && missing.includes(what);
  const india = dial === INDIA_DIAL;

  if (done) {
    return (
      <div className="py-6 text-center" role="status">
        <div aria-hidden="true" className="mx-auto grid size-16 place-items-center rounded-full bg-emerald-50 text-3xl ring-1 ring-emerald-200">✓</div>
        <h2 className="display mt-5 text-3xl">Application sent!</h2>
        <p className="mx-auto mt-3 max-w-sm text-[15px] leading-relaxed text-muted">
          Thanks, {name.split(" ")[0] || "there"}. We read every application and call the people we shortlist for a short chat, usually within a few days.
          {done.emailed && " We've emailed you a copy of the details."}
        </p>
        <p className="mx-auto mt-4 max-w-sm text-sm text-muted">The internship starts on {INTERNSHIP.startsLabel}.</p>
      </div>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (missing.length) return setTried(true);
    setBusy(true);
    const res = await fetch("/api/internship/apply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, dial, phone, city, role, org, linkedin, instagram, hours, experience, why, website }),
    }).catch(() => null);
    const out = await res?.json().catch(() => null);
    setBusy(false);
    if (res?.ok && out?.ok) return setDone({ emailed: out.emailed === true });
    setError(out?.error ?? "Something went wrong. Check your connection and try again.");
  }

  return (
    <form noValidate onSubmit={submit} className="flex flex-col gap-5">
      <div>
        <h2 className="display text-2xl sm:text-3xl">Apply for the internship</h2>
        <p className="mt-1 text-sm text-muted">Takes about two minutes. Starts {INTERNSHIP.startsLabel}.</p>
      </div>

      {/* Hidden from people; bots fill it in. */}
      <input type="text" name="website" value={website} onChange={(e) => setWebsite(e.target.value)} tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 opacity-0" />

      <div>
        <label htmlFor="i-name" className="text-[13px] font-bold">Your name</label>
        <input id="i-name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" placeholder="Rohan Sharma" maxLength={INTERNSHIP_LIMITS.name} aria-invalid={wrong("your name")} className={clsx(input, wrong("your name") ? bad : ok)} />
      </div>

      <div>
        <label htmlFor="i-email" className="text-[13px] font-bold">Email</label>
        <input id="i-email" type="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" autoCapitalize="none" spellCheck={false} placeholder="you@gmail.com" maxLength={254} aria-invalid={wrong("a valid email")} className={clsx(input, wrong("a valid email") ? bad : ok)} />
      </div>

      <div>
        <label htmlFor="i-phone" className="text-[13px] font-bold">WhatsApp number</label>
        <div className="flex gap-2">
          <div className="relative w-[104px] flex-none">
            <select value={dial} onChange={(e) => setDial(e.target.value)} aria-label="Country code" autoComplete="tel-country-code" className={clsx(input, ok, "cursor-pointer appearance-none text-transparent")}>
              {DIAL_CODES.map((c) => <option key={c.dial} value={c.dial} className="text-ink">{`${c.flag} ${c.name} (+${c.dial})`}</option>)}
            </select>
            <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 top-1.5 flex items-center gap-1 pl-4 text-base font-semibold text-ink">
              {DIAL_CODES.find((c) => c.dial === dial)?.flag} +{dial}
              <ChevronDown size={14} className="text-muted" />
            </span>
          </div>
          <input id="i-phone" type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel-national" placeholder={india ? "98765 43210" : "Phone number"} maxLength={20} aria-invalid={wrong(phoneProblem(dial))} className={clsx(input, "min-w-0", wrong(phoneProblem(dial)) ? bad : ok)} />
        </div>
      </div>

      <div>
        <label htmlFor="i-city" className="text-[13px] font-bold">City {optional}</label>
        <input id="i-city" value={city} onChange={(e) => setCity(e.target.value)} autoComplete="address-level2" placeholder="Delhi, Pune, Bengaluru…" maxLength={INTERNSHIP_LIMITS.city} className={clsx(input, ok)} />
      </div>

      <Pills label="You are" value={role} options={ROLES} onPick={setRole} invalid={tried && !role} />

      {role && (
        <div>
          <label htmlFor="i-org" className="text-[13px] font-bold">{role === "working" ? "Company and role" : "College and year"} {optional}</label>
          <input id="i-org" value={org} onChange={(e) => setOrg(e.target.value)} placeholder={role === "working" ? "Swiggy, sales executive" : "DTU, 3rd year"} maxLength={INTERNSHIP_LIMITS.org} className={clsx(input, ok)} />
        </div>
      )}

      <Pills label="Time you can give" value={hours} options={HOURS} onPick={setHours} invalid={tried && !hours} />

      <div>
        <label htmlFor="i-linkedin" className="text-[13px] font-bold">LinkedIn profile {optional}</label>
        <input id="i-linkedin" type="url" inputMode="url" value={linkedin} onChange={(e) => setLinkedin(e.target.value)} autoCapitalize="none" spellCheck={false} placeholder="linkedin.com/in/your-name" maxLength={INTERNSHIP_LIMITS.linkedin} aria-invalid={wrong("a LinkedIn profile link, or leave it blank")} className={clsx(input, wrong("a LinkedIn profile link, or leave it blank") ? bad : ok)} />
      </div>

      <div>
        <label htmlFor="i-instagram" className="text-[13px] font-bold">Instagram handle {optional}</label>
        <input id="i-instagram" value={instagram} onChange={(e) => setInstagram(e.target.value)} autoCapitalize="none" spellCheck={false} placeholder="@yourhandle" maxLength={INTERNSHIP_LIMITS.instagram} className={clsx(input, ok)} />
      </div>

      <div>
        <label htmlFor="i-exp" className="text-[13px] font-bold">Any sales or marketing experience? {optional}</label>
        <textarea id="i-exp" value={experience} onChange={(e) => setExperience(e.target.value)} rows={2} placeholder="College fest sponsorships, a side business, a sales job…" maxLength={INTERNSHIP_LIMITS.experience} className={clsx(input, ok, "resize-y")} />
      </div>

      <div>
        <label htmlFor="i-why" className="text-[13px] font-bold">Why do you want this, and why would you be good at it?</label>
        <textarea id="i-why" value={why} onChange={(e) => setWhy(e.target.value)} rows={4} placeholder="A few lines is enough." maxLength={INTERNSHIP_LIMITS.why} aria-invalid={wrong("a few lines on why you want this")} className={clsx(input, wrong("a few lines on why you want this") ? bad : ok, "resize-y")} />
      </div>

      {tried && missing.length > 0 && <p role="alert" className="rounded-xl bg-error-tint px-4 py-3 text-sm font-medium text-error">Add {missing.join(", ")}.</p>}
      {error && <p role="alert" className="rounded-xl bg-error-tint px-4 py-3 text-sm font-medium text-error">{error}</p>}

      <button
        type="submit"
        disabled={busy}
        className="mt-1 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-red-strong px-5 py-4 text-base font-bold text-white transition-[background-color,transform] duration-150 hover:bg-red-press active:scale-[0.98] disabled:opacity-60"
      >
        {busy ? "Sending…" : "Send my application"}
        {!busy && <span aria-hidden="true">→</span>}
      </button>
    </form>
  );
}
