"use client";

import { HIDE_MONEY } from "@/lib/site-status";
import Image from "next/image";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { experienceOptions, roleOptions } from "@/data/program";
import { contact, enrolment } from "@/data/config";
import { getTrack, tracks } from "@/data/tracks";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/FormField";
import { SelectField } from "@/components/ui/Select";
import { RegistrationSuccess, type SuccessState } from "./RegistrationSuccess";
import { registerInterest, startGoogleRegistration, switchGoogleAccount, type RegisterResult } from "@/app/(register)/register/actions";
import { GoogleMark } from "@/components/ui/GoogleMark";
import { track } from "@/lib/analytics";
import { COURSE_REPO_NAMES, emptyRegistration, orderedErrors, validateRegistration, type RegistrationData, type RegistrationErrors } from "@/lib/validation";
import type { TrackSlug } from "@/types/program";

const toOptions = (list: string[]) => list.map((v) => ({ value: v, label: v }));

/** The Google account a visitor signed in with from this form. */
export interface GoogleUser {
  email: string;
  name: string;
  image: string | null;
}

type Failure = Extract<RegisterResult, { ok: false }>;

/** Each field's name as the person reads it, for the list of what to fix. The message itself sits under the field. */
const FIELD_LABELS: Record<keyof RegistrationData, string> = {
  name: "Full name", email: "Email", phone: "Phone", track: "Career track", currentRole: "Current role",
  experience: "Years of experience", linkedin: "LinkedIn URL", github: "Course repository URL",
  repoConfirm: "Repository confirmation", consent: "Agreement to be contacted",
};

/** Said under a failure that is not a mistake in the form, so the person knows what to do and that nothing was lost. */
const FAILURE_NEXT: Record<NonNullable<Failure["kind"]>, string> = {
  signin: "Your answers are not saved anywhere yet, so sign in again and add your details again.",
  limited: "Wait a little, then press Register again. Your answers are still here.",
  unavailable: "Your answers are still here. Try again in a few minutes.",
  "save-failed": "Your answers are still here. Press Register to try again.",
  support: "Trying again will not help. Email us and we will sort it out.",
};

/**
 * `bare` drops the framing so the form can sit inside a card of its own.
 * The account is the identity: its name fills in, and the email is the
 * verified one, so there is no email field to get wrong.
 * `unknownTrack` says the link named a track that does not exist, so the empty
 * picker is explained rather than silent.
 */
export function RegistrationForm({
  defaultTrack, bare, googleUser, titled, unknownTrack, onTrackChange, onDoneChange,
}: {
  defaultTrack?: TrackSlug; bare?: boolean; googleUser: GoogleUser; titled?: boolean; unknownTrack?: boolean;
  onTrackChange?: (track: TrackSlug | "") => void;
  /** Told when a saved registration replaces the form, and when it hands the form back. */
  onDoneChange?: (done: boolean) => void;
}) {
  const [data, setData] = useState<RegistrationData>({
    ...emptyRegistration,
    track: defaultTrack ?? "",
    name: googleUser.name,
    email: googleUser.email,
  });
  const [errors, setErrors] = useState<RegistrationErrors>({});
  const [result, setResult] = useState<SuccessState | null>(null);
  const [pending, setPending] = useState(false);
  const [honeypot, setHoneypot] = useState("");
  const [failure, setFailure] = useState<{ message: string; kind?: Failure["kind"] } | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  /** A field to focus as soon as the form unlocks, after the server found a mistake in it. */
  const refocus = useRef<string | null>(null);
  const successRef = useRef<HTMLDivElement>(null);
  const chosenTrack = getTrack(data.track);
  // Invite-only tracks are offered only to someone who arrived on their link.
  const invited = defaultTrack ? getTrack(defaultTrack) : undefined;
  // A challenge, like an invite-only track, is offered when they came from its page.
  const trackOptions = invited && !tracks.includes(invited) ? [...tracks, invited] : tracks;
  const isChallenge = chosenTrack?.kind === "challenge";
  const total = isChallenge ? 60 : 30;
  const busy = pending;
  // False on the server and until this form is hydrated. Before that a press
  // of Register would be a plain browser submit, which puts the name, email
  // and phone in the address bar. So Register waits for the page to be ready.
  const hydrated = useSyncExternalStore(() => () => {}, () => true, () => false);
  const problems = orderedErrors(errors);

  const repoName = data.track ? COURSE_REPO_NAMES[data.track] : "your-course-portfolio";

  useEffect(() => {
    if (busy || !refocus.current) return;
    const el = formRef.current?.querySelector<HTMLElement>(`#${refocus.current}`);
    refocus.current = null;
    el?.scrollIntoView({ block: "center", behavior: "smooth" });
    el?.focus({ preventScroll: true });
  }, [busy]);

  // A saved registration replaces the form: bring it into view and to the screen reader.
  useEffect(() => {
    if (!result) return;
    successRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
    successRef.current?.focus({ preventScroll: true });
  }, [result]);

  function set<K extends keyof RegistrationData>(key: K, value: RegistrationData[K]) {
    setData((d) => ({ ...d, [key]: value }));
    if (key === "track") onTrackChange?.(value as TrackSlug | "");
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  }

  /** Check a text field when the person leaves it, but only once there is something to check: tabbing past an empty box is not a mistake yet. */
  function checkOnLeave(key: "name" | "phone" | "linkedin" | "github") {
    if (!data[key].trim()) return;
    const message = validateRegistration(data)[key];
    setErrors((e) => ({ ...e, [key]: message }));
  }

  function focusField(key: string) {
    const el = formRef.current?.querySelector<HTMLElement>(`#${key}`);
    el?.scrollIntoView({ block: "center", behavior: "smooth" });
    el?.focus({ preventScroll: true });
  }

  function focusFirst(found: RegistrationErrors) {
    const first = orderedErrors(found)[0]?.[0];
    if (first) focusField(first);
    return !!first;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setFailure(null);
    const found = validateRegistration(data);
    setErrors(found);
    if (focusFirst(found)) return;

    setPending(true);
    try {
      const response = await registerInterest(data, honeypot);
      if (!response.ok) {
        // The form is locked while the request runs, and a locked field cannot take focus: go there once it is unlocked.
        if (response.errors) { setErrors(response.errors); refocus.current = orderedErrors(response.errors)[0]?.[0] ?? null; }
        if (response.message) setFailure({ message: response.message, kind: response.kind });
        if (!response.errors) refocus.current = "register-submit";
        return;
      }
      setResult({
        enrolled: !!response.enrolled,
        duplicate: !!response.duplicate,
        email: response.email ?? data.email.trim(),
        track: chosenTrack,
        repo: response.repo,
      });
      onDoneChange?.(true);
      track("register_submit", { track_slug: data.track || "none", enrolled: !!response.enrolled, repeat: !!response.duplicate });
    } catch {
      setFailure({ message: "We couldn't reach the server. Check your connection and try again." });
      refocus.current = "register-submit";
      return;
    } finally {
      setPending(false);
    }
  }

  if (result) {
    return (
      <div ref={successRef} tabIndex={-1} role="status" aria-labelledby="register-success-title" className="scroll-mt-6 rounded-card bg-night text-paper focus:outline-none">
        <RegistrationSuccess {...result} onRetry={() => { setResult(null); onDoneChange?.(false); }} />
      </div>
    );
  }

  return (
    <>
      <div className={bare ? "" : "rounded-card bg-card p-6 shadow-card sm:p-8"}>
      {/* Names the track being started, and follows the track picker below. */}
      {titled && (
        <>
          <h2 className="text-2xl font-bold text-balance">
            Start the {chosenTrack ? <span className="text-red-deep">{chosenTrack.name}</span> : null}{isChallenge ? (chosenTrack?.name.endsWith("Challenge") ? "" : " challenge") : " track"}
          </h2>
          <p className="mt-1 mb-6 text-sm text-muted">Takes about a minute. Your name and email come from your Google account. Add the rest below.</p>
        </>
      )}
      {unknownTrack && !data.track && (
        <p className="mb-5 rounded-lg border border-line/40 bg-surface/50 px-3 py-2.5 text-sm text-ink/80">
          We didn&apos;t recognise the track in that link. Choose yours below.
        </p>
      )}
      <div className="mb-5 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-line/30 bg-surface/40 p-3">
        {googleUser.image ? (
          <Image src={googleUser.image} alt="" width={36} height={36} className="size-9 shrink-0 rounded-full object-cover" />
        ) : (
          <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-full bg-card"><GoogleMark /></span>
        )}
        <div className="min-w-0 flex-1 basis-40 text-sm">
          <p className="truncate font-semibold">{googleUser.name || googleUser.email}</p>
          <p className="break-all text-muted">Registering as {googleUser.email}</p>
        </div>
        <form action={switchGoogleAccount} className="ml-auto">
          <input type="hidden" name="track" value={data.track} />
          <button type="submit" disabled={busy} className="shrink-0 text-xs font-semibold text-muted underline underline-offset-4 hover:text-ink disabled:opacity-60">
            Use a different account
          </button>
        </form>
      </div>
      <form
        ref={formRef}
        onSubmit={onSubmit}
        // Never GET: if this is ever submitted without the script (not yet
        // loaded, or blocked), a GET would put the name, email, phone and
        // repository in the address bar, the history and the logs. A POST to
        // this page carries them in the body and just shows the page again.
        method="post"
        noValidate
        aria-busy={pending}
        className={bare ? "grid gap-4 sm:grid-cols-2" : "grid gap-5 sm:grid-cols-2"}
      >
      {/* Everything locks while the request runs, so a second press or an edit cannot race the first. */}
      <fieldset disabled={busy} className="contents">
      <div className="sm:col-span-2"><TextField id="name" label="Full name" autoComplete="name" placeholder="e.g. John Doe" value={data.name} onChange={(e) => set("name", e.target.value)} onBlur={() => checkOnLeave("name")} error={errors.name} /></div>
      <div className="sm:col-span-2">
      <TextField id="phone" label="Phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="+91 98765 43210" value={data.phone} onChange={(e) => set("phone", e.target.value)} onBlur={() => checkOnLeave("phone")} error={errors.phone} />
      </div>
      <div className="sm:col-span-2">
        <SelectField id="track" label="Career track" placeholder="Choose a track" options={trackOptions.map((t) => ({ value: t.slug, label: t.name, disabled: !t.available, hint: t.available ? undefined : "Opening later" }))}
          value={data.track} onValueChange={(v) => set("track", v as TrackSlug | "")} error={errors.track} />
        {chosenTrack && (
          <p className="mt-2 text-xs leading-relaxed text-ink/70">
            <span className="font-semibold text-ink">{chosenTrack.name} to {chosenTrack.becomes}.</span>{" "}
            30 days, {enrolment.dailyTime}.{" "}
            {chosenTrack.contentLive ? "Day 1 opens as soon as you register." : "Registering reserves your place; we email you when Day 1 opens."}
          </p>
        )}
      </div>
      <SelectField id="currentRole" label="Current role" placeholder="Select role" options={toOptions(roleOptions)} value={data.currentRole} onValueChange={(v) => set("currentRole", v)} error={errors.currentRole} />
      <SelectField id="experience" label="Years of experience" placeholder="Select experience" options={toOptions(experienceOptions)} value={data.experience} onValueChange={(v) => set("experience", v)} error={errors.experience} />
      <div className="sm:col-span-2">
        <TextField id="linkedin" label="LinkedIn URL" optional type="url" placeholder="https://linkedin.com/in/yourname" value={data.linkedin} onChange={(e) => set("linkedin", e.target.value)} onBlur={() => checkOnLeave("linkedin")} error={errors.linkedin} />
      </div>
      <div className="sm:col-span-2">
        <TextField id="github" label="Course repository URL" type="url" inputMode="url" autoCapitalize="off" spellCheck={false}
          placeholder={`https://github.com/your-username/${repoName}`} value={data.github} onChange={(e) => set("github", e.target.value)} onBlur={() => checkOnLeave("github")} error={errors.github} />
        <p className="mt-2 text-xs leading-relaxed text-ink/70">
          No repository yet?{" "}
          <a href={`https://github.com/new?name=${repoName}&visibility=public`} target="_blank" rel="noopener noreferrer" className="font-semibold text-red-strong underline underline-offset-2">
            Create {repoName} on GitHub
          </a>{" "}
          (public, about 30 seconds), then paste its link here. We check that it exists and is public when you register.
        </p>
        <p className="mt-3 rounded-lg border border-red-strong/25 bg-red-strong/5 px-3 py-2.5 text-xs leading-relaxed text-ink/85">
          <strong className="font-bold text-red-strong">Important:</strong> this repository will be used throughout your {total} days for verification. Make sure you type it correctly.
        </p>
        <div className="mt-3 flex items-start gap-3">
          <input id="repoConfirm" type="checkbox" checked={data.repoConfirm} onChange={(e) => set("repoConfirm", e.target.checked)}
            aria-invalid={!!errors.repoConfirm} aria-describedby={errors.repoConfirm ? "repoConfirm-error" : undefined}
            className="mt-0.5 size-4 shrink-0 accent-red-strong" />
          <label htmlFor="repoConfirm" className="text-xs leading-relaxed text-ink/80">
            I have provided the correct GitHub repository URL, which will be used throughout my {total} days for verification.
          </label>
        </div>
        {errors.repoConfirm && <p id="repoConfirm-error" className="mt-1.5 text-xs font-medium text-error">{errors.repoConfirm}</p>}
      </div>
      <div className="sm:col-span-2">
        <div className="flex items-start gap-3">
          <input id="consent" type="checkbox" checked={data.consent} onChange={(e) => set("consent", e.target.checked)}
            aria-invalid={!!errors.consent} aria-describedby={errors.consent ? "consent-error" : undefined}
            className="mt-0.5 size-4 shrink-0 accent-red-strong" />
          <label htmlFor="consent" className="text-xs leading-relaxed text-ink/80">
            I agree to be contacted by Klymb.ai about this program by email or phone, and I have read the{" "}
            <a href="/privacy" className="font-semibold underline">Privacy Policy</a>.
          </label>
        </div>
        {errors.consent && <p id="consent-error" className="mt-1.5 text-xs font-medium text-error">{errors.consent}</p>}
      </div>
      {/* Honeypot: hidden from people, irresistible to bots. */}
      <div aria-hidden="true" className="pointer-events-none absolute left-[-9999px] size-0 overflow-hidden">
        <label htmlFor="company-website">Company website</label>
        <input id="company-website" name="company-website" type="text" tabIndex={-1} autoComplete="off"
          value={honeypot} onChange={(e) => setHoneypot(e.target.value)} />
      </div>
      </fieldset>
      <div className="sm:col-span-2">
        {problems.length > 0 && (
          <div role="alert" className="mb-3 rounded-lg border border-error/30 bg-error-tint/60 px-3 py-2.5 text-sm text-error">
            <p className="font-bold">{problems.length === 1 ? "One answer needs fixing before you can register:" : `${problems.length} answers need fixing before you can register:`}</p>
            <ul className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1">
              {problems.map(([key]) => (
                <li key={key}>
                  <button type="button" onClick={() => focusField(key)} className="font-medium underline underline-offset-2">{FIELD_LABELS[key]}</button>
                </li>
              ))}
            </ul>
          </div>
        )}
        {failure && (
          <div role="alert" className="mb-3 rounded-lg border border-error/30 bg-error-tint/60 px-3 py-2.5 text-sm font-medium text-error">
            <p>{failure.message}</p>
            <p className="mt-1 font-normal text-ink/75">
              {failure.kind ? FAILURE_NEXT[failure.kind] : "Your answers are still here. Press Register to try again."}{" "}
              Still stuck? <a href={`mailto:${contact.email}`} className="font-semibold underline underline-offset-2">{contact.email}</a>
            </p>
            {failure.kind === "signin" && (
              <form action={startGoogleRegistration} className="mt-3">
                <input type="hidden" name="track" value={data.track} />
                <button type="submit" className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-ink ring-1 ring-line/40 hover:bg-paper">
                  <GoogleMark /> Sign in with Google
                </button>
              </form>
            )}
          </div>
        )}
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button id="register-submit" type="submit" soft arrow={!pending} disabled={busy || !hydrated} aria-busy={pending} className="rounded-full px-8! py-3!">
            {pending ? "Saving your registration…" : chosenTrack ? `Register for ${chosenTrack.name}` : "Register"}
          </Button>
        </div>
        <p role="status" className="sr-only">{pending ? "Saving your registration…" : ""}</p>
        {!HIDE_MONEY && <p className="mt-3 text-center text-xs text-muted">You pay on the next screen, after registering.</p>}
      </div>
      </form>
      </div>
    </>
  );
}
