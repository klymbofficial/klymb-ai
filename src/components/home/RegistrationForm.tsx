"use client";

import { useRef, useState } from "react";
import { contact } from "@/data/config";
import { experienceOptions, roleOptions } from "@/data/program";
import { tracks } from "@/data/tracks";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { SelectField, TextField } from "@/components/ui/FormField";
import { RegistrationSuccess, type SuccessState } from "./RegistrationSuccess";
import { registerInterest } from "@/app/(site)/register/actions";
import { track } from "@/lib/analytics";
import { emptyRegistration, validateRegistration, type RegistrationData, type RegistrationErrors } from "@/lib/validation";
import type { TrackSlug } from "@/types/program";

const toOptions = (list: string[]) => list.map((v) => ({ value: v, label: v }));

/** `bare` drops the framing so the form can sit inside a card of its own. */
export function RegistrationForm({ defaultTrack, bare }: { defaultTrack?: TrackSlug; bare?: boolean }) {
  const [data, setData] = useState<RegistrationData>({ ...emptyRegistration, track: defaultTrack ?? "" });
  const [errors, setErrors] = useState<RegistrationErrors>({});
  const [result, setResult] = useState<SuccessState | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [honeypot, setHoneypot] = useState("");
  const [serverError, setServerError] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const successRef = useRef<HTMLDivElement>(null);

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
      <form
        ref={formRef}
        onSubmit={onSubmit}
        noValidate
        className={bare ? "grid gap-4 sm:grid-cols-2" : "grid gap-5 rounded-card bg-card p-6 shadow-card sm:grid-cols-2 sm:p-8"}
      >
      <div className="sm:col-span-2"><TextField id="name" label="Full name" autoComplete="name" placeholder="e.g. John Doe" value={data.name} onChange={(e) => set("name", e.target.value)} error={errors.name} /></div>
      <TextField id="email" label="Email" type="email" autoComplete="email" placeholder="e.g. john@example.com" value={data.email} onChange={(e) => set("email", e.target.value)} error={errors.email} />
      <TextField id="phone" label="Phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="+91 98765 43210" value={data.phone} onChange={(e) => set("phone", e.target.value)} error={errors.phone} />
      <div className="sm:col-span-2">
        <SelectField id="track" label="Career track" placeholder="Choose a track" options={tracks.map((t) => ({ value: t.slug, label: t.available ? t.name : `${t.name}: opening later`, disabled: !t.available }))}
          value={data.track} onChange={(e) => set("track", e.target.value as TrackSlug | "")} error={errors.track} />
      </div>
      <SelectField id="currentRole" label="Current role" placeholder="Select role" options={toOptions(roleOptions)} value={data.currentRole} onChange={(e) => set("currentRole", e.target.value)} error={errors.currentRole} />
      <SelectField id="experience" label="Years of experience" placeholder="Select experience" options={toOptions(experienceOptions)} value={data.experience} onChange={(e) => set("experience", e.target.value)} error={errors.experience} />
      <div className="sm:col-span-2">
        <TextField id="linkedin" label="LinkedIn URL" optional type="url" placeholder="https://linkedin.com/in/yourname" value={data.linkedin} onChange={(e) => set("linkedin", e.target.value)} error={errors.linkedin} />
      </div>
      <div className="sm:col-span-2">
        <TextField id="github" label="GitHub URL" optional type="url" placeholder="https://github.com/yourname" value={data.github} onChange={(e) => set("github", e.target.value)} error={errors.github} />
      </div>
      <div className="sm:col-span-2">
        <div className="flex items-start gap-3">
          <input id="consent" type="checkbox" checked={data.consent} onChange={(e) => set("consent", e.target.checked)}
            aria-invalid={!!errors.consent} aria-describedby={errors.consent ? "consent-error" : undefined}
            className="mt-1 size-5 shrink-0 accent-red-strong" />
          <label htmlFor="consent" className="text-[13px] leading-relaxed">
            I agree to be contacted by Klymb.ai about this program by email or phone, and I have read the{" "}
            <a href="/privacy" className="font-semibold underline">Privacy Policy</a>. Questions: {contact.email}
          </label>
        </div>
        {errors.consent && <p id="consent-error" className="mt-1 text-sm font-semibold text-red-deep">{errors.consent}</p>}
      </div>
      {/* Honeypot: hidden from people, irresistible to bots. */}
      <div aria-hidden="true" className="pointer-events-none absolute left-[-9999px] size-0 overflow-hidden">
        <label htmlFor="company-website">Company website</label>
        <input id="company-website" name="company-website" type="text" tabIndex={-1} autoComplete="off"
          value={honeypot} onChange={(e) => setHoneypot(e.target.value)} />
      </div>
      <div className="sm:col-span-2">
        {serverError && <p role="alert" className="mb-3 rounded-lg border border-red-deep bg-red-tint p-3 text-sm font-semibold text-red-deep">{serverError}</p>}
        <Button type="submit" arrow disabled={pending} aria-busy={pending} className="w-full rounded-full py-4">{pending ? "Saving…" : "Register"}</Button>
        <p className="mt-3 text-center text-[11px] text-muted">You pay on the next screen, after registering.</p>
      </div>
      </form>

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
