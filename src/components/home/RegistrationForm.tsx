"use client";

import Image from "next/image";
import { useId, useRef, useState } from "react";
import { experienceOptions, roleOptions } from "@/data/program";
import { tracks } from "@/data/tracks";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { TextField } from "@/components/ui/FormField";
import { SelectField } from "@/components/ui/Select";
import { RegistrationSuccess, type SuccessState } from "./RegistrationSuccess";
import { registerInterest, startGoogleRegistration, switchGoogleAccount } from "@/app/(register)/register/actions";
import { GoogleMark } from "@/components/ui/GoogleMark";
import { track } from "@/lib/analytics";
import { COURSE_REPO_NAMES, emptyRegistration, validateRegistration, type RegistrationData, type RegistrationErrors } from "@/lib/validation";
import type { TrackSlug } from "@/types/program";

const toOptions = (list: string[]) => list.map((v) => ({ value: v, label: v }));

/** The Google account a visitor signed in with from this form. */
export interface GoogleUser {
  email: string;
  name: string;
  image: string | null;
}

/**
 * `bare` drops the framing so the form can sit inside a card of its own.
 * With `googleUser`, the account is the identity: its name fills in, and the
 * email is the verified one, so there is no email field to get wrong.
 */
export function RegistrationForm({
  defaultTrack, bare, googleUser, titled,
}: { defaultTrack?: TrackSlug; bare?: boolean; googleUser?: GoogleUser; titled?: boolean }) {
  const [data, setData] = useState<RegistrationData>({
    ...emptyRegistration,
    track: defaultTrack ?? "",
    name: googleUser?.name ?? "",
    email: googleUser?.email ?? "",
  });
  const [errors, setErrors] = useState<RegistrationErrors>({});
  const [result, setResult] = useState<SuccessState | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [honeypot, setHoneypot] = useState("");
  const [serverError, setServerError] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const chosenTrack = tracks.find((t) => t.slug === data.track);
  const googleFormId = `google-register-${useId().replace(/:/g, "")}`;
  const successRef = useRef<HTMLDivElement>(null);

  const repoName = data.track ? COURSE_REPO_NAMES[data.track] : "your-course-portfolio";


  function set<K extends keyof RegistrationData>(key: K, value: RegistrationData[K]) {
    setData((d) => ({ ...d, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  }

  function focusFirst(found: RegistrationErrors) {
    const first = Object.keys(found)[0];
    if (first) formRef.current?.querySelector<HTMLElement>(`#${first}`)?.focus();
    return !!first;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pending) return;
    setServerError("");
    const found = validateRegistration(data);
    setErrors(found);
    if (focusFirst(found)) return;

    setPending(true);
    try {
      const response = await registerInterest(data, honeypot);
      if (!response.ok) {
        if (response.errors) { setErrors(response.errors); focusFirst(response.errors); }
        setServerError(response.message ?? "");
        return;
      }
      setResult({
        enrolled: !!response.enrolled,
        duplicate: !!response.duplicate,
        email: data.email.trim(),
        track: tracks.find((t) => t.slug === data.track),
        signedIn: !!response.signedIn,
      });
      track("register_submit", { track_slug: data.track || "none", enrolled: !!response.enrolled, repeat: !!response.duplicate });
    } catch {
      setServerError("Network error. Please check your connection and try again.");
      return;
    } finally {
      setPending(false);
    }
    setModalOpen(true);
  }

  if (result && !modalOpen) {
    return (
      <div ref={successRef} tabIndex={-1} role="status" className="rounded-card bg-night text-paper focus:outline-none">
        <RegistrationSuccess {...result} />
      </div>
    );
  }

  return (
    <>
      <div className={bare ? "" : "rounded-card bg-card p-6 shadow-card sm:p-8"}>
      {/* Names the cohort being joined, and follows the track picker below. */}
      {titled && (
        <>
          <h2 className="text-2xl font-bold text-balance">
            Register for the {chosenTrack ? <span className="text-red-deep">{chosenTrack.name}</span> : null} cohort
          </h2>
          <p className="mt-1 mb-6 text-sm text-muted">Takes a minute. Registering with Google fills in your details.</p>
        </>
      )}
      {googleUser && (
        <div className="mb-5 flex items-center gap-3 rounded-lg border border-line/30 bg-surface/40 p-3">
          {googleUser.image ? (
            <Image src={googleUser.image} alt="" width={36} height={36} className="size-9 shrink-0 rounded-full object-cover" />
          ) : (
            <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-full bg-card"><GoogleMark /></span>
          )}
          <div className="min-w-0 flex-1 text-sm">
            <p className="truncate font-semibold">{googleUser.name || googleUser.email}</p>
            <p className="truncate text-muted">Registering as {googleUser.email}</p>
          </div>
          <form action={switchGoogleAccount}>
            <input type="hidden" name="track" value={data.track} />
            <button type="submit" className="shrink-0 text-xs font-semibold text-muted underline underline-offset-4 hover:text-ink">
              Use a different account
            </button>
          </form>
        </div>
      )}
      <form
        ref={formRef}
        onSubmit={onSubmit}
        noValidate
        className={bare ? "grid gap-4 sm:grid-cols-2" : "grid gap-5 sm:grid-cols-2"}
      >
      <div className="sm:col-span-2"><TextField id="name" label="Full name" autoComplete="name" placeholder="e.g. John Doe" value={data.name} onChange={(e) => set("name", e.target.value)} error={errors.name} /></div>
      {!googleUser && (
        <TextField id="email" label="Email" type="email" autoComplete="email" placeholder="e.g. john@example.com" value={data.email} onChange={(e) => set("email", e.target.value)} error={errors.email} />
      )}
      <div className={googleUser ? "sm:col-span-2" : undefined}>
      <TextField id="phone" label="Phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="+91 98765 43210" value={data.phone} onChange={(e) => set("phone", e.target.value)} error={errors.phone} />
      </div>
      <div className="sm:col-span-2">
        <SelectField id="track" label="Career track" placeholder="Choose a track" options={tracks.map((t) => ({ value: t.slug, label: t.name, disabled: !t.available, hint: t.available ? undefined : "Opening later" }))}
          value={data.track} onValueChange={(v) => set("track", v as TrackSlug | "")} error={errors.track} />
      </div>
      <SelectField id="currentRole" label="Current role" placeholder="Select role" options={toOptions(roleOptions)} value={data.currentRole} onValueChange={(v) => set("currentRole", v)} error={errors.currentRole} />
      <SelectField id="experience" label="Years of experience" placeholder="Select experience" options={toOptions(experienceOptions)} value={data.experience} onValueChange={(v) => set("experience", v)} error={errors.experience} />
      <div className="sm:col-span-2">
        <TextField id="linkedin" label="LinkedIn URL" optional type="url" placeholder="https://linkedin.com/in/yourname" value={data.linkedin} onChange={(e) => set("linkedin", e.target.value)} error={errors.linkedin} />
      </div>
      <div className="sm:col-span-2">
        <TextField id="github" label="Course repository URL" type="url" inputMode="url" autoCapitalize="off" spellCheck={false}
          placeholder={`https://github.com/your-username/${repoName}`} value={data.github} onChange={(e) => set("github", e.target.value)} error={errors.github} />
        <p className="mt-2 text-xs leading-relaxed text-ink/70">
          No repository yet?{" "}
          <a href={`https://github.com/new?name=${repoName}&visibility=public`} target="_blank" rel="noopener noreferrer" className="font-semibold text-red-strong underline underline-offset-2">
            Create {repoName} on GitHub
          </a>{" "}
          (public, about 30 seconds), then paste its link here.
        </p>
        <p className="mt-3 rounded-lg border border-red-strong/25 bg-red-strong/5 px-3 py-2.5 text-xs leading-relaxed text-ink/85">
          <strong className="font-bold text-red-strong">Important:</strong> this repository will be used throughout the cohort for verification. Make sure you type it correctly.
        </p>
        <div className="mt-3 flex items-start gap-3">
          <input id="repoConfirm" type="checkbox" checked={data.repoConfirm} onChange={(e) => set("repoConfirm", e.target.checked)}
            aria-invalid={!!errors.repoConfirm} aria-describedby={errors.repoConfirm ? "repoConfirm-error" : undefined}
            className="mt-0.5 size-4 shrink-0 accent-red-strong" />
          <label htmlFor="repoConfirm" className="text-xs leading-relaxed text-ink/80">
            I have provided the correct GitHub repository URL, which will be used throughout the cohort for verification.
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
      <div className="sm:col-span-2">
        {serverError && <p role="alert" className="mb-3 rounded-lg border border-error/30 bg-error-tint/60 px-3 py-2.5 text-sm font-medium text-error">{serverError}</p>}
        <div className="flex flex-wrap items-center justify-center gap-3">
          {/* Belongs to the Google form below (via `form`), so it never
              submits, or validates, the details form it sits in. */}
          {!googleUser && (
            <button
              type="submit"
              form={googleFormId}
              className="inline-flex items-center justify-center gap-2.5 rounded-full border border-line/50 bg-card px-6 py-3 text-sm font-bold transition-[background-color,border-color] duration-200 hover:border-ink/40 hover:bg-surface/50"
            >
              <GoogleMark />
              Register with Google
            </button>
          )}
          <Button type="submit" soft arrow disabled={pending} aria-busy={pending} className="rounded-full px-8! py-3!">{pending ? "Saving…" : "Register"}</Button>
        </div>
        <p className="mt-3 text-center text-xs text-muted">You pay on the next screen, after registering.</p>
      </div>
      </form>
      {!googleUser && (
        <form id={googleFormId} action={startGoogleRegistration} className="hidden">
          <input type="hidden" name="track" value={data.track} />
        </form>
      )}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          requestAnimationFrame(() => successRef.current?.focus());
        }}
        labelledBy="register-success-title"
      >
        {result && <RegistrationSuccess {...result} />}
      </Modal>
    </>
  );
}
