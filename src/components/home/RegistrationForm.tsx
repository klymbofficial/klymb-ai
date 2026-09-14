"use client";

import { useRef, useState } from "react";
import { contact } from "@/data/config";
import { experienceOptions, roleOptions } from "@/data/program";
import { tracks } from "@/data/tracks";
import { Button } from "@/components/ui/Button";
import { SelectField, TextField } from "@/components/ui/FormField";
import { emptyRegistration, validateRegistration, type RegistrationData, type RegistrationErrors } from "@/lib/validation";
import type { TrackSlug } from "@/types/program";

const toOptions = (list: string[]) => list.map((v) => ({ value: v, label: v }));

export function RegistrationForm({ defaultTrack }: { defaultTrack?: TrackSlug }) {
  const [data, setData] = useState<RegistrationData>({ ...emptyRegistration, track: defaultTrack ?? "" });
  const [errors, setErrors] = useState<RegistrationErrors>({});
  const [submitted, setSubmitted] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const successRef = useRef<HTMLDivElement>(null);

  function set<K extends keyof RegistrationData>(key: K, value: RegistrationData[K]) {
    setData((d) => ({ ...d, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const found = validateRegistration(data);
    setErrors(found);
    const first = Object.keys(found)[0];
    if (first) {
      formRef.current?.querySelector<HTMLElement>(`#${first}`)?.focus();
      return;
    }
    // TODO(Supabase): save the registration. Nothing is stored or sent yet.
    setSubmitted(true);
    requestAnimationFrame(() => successRef.current?.focus());
  }

  if (submitted) {
    const track = tracks.find((t) => t.slug === data.track);
    return (
      <div ref={successRef} tabIndex={-1} role="status" className="border-2 border-ink bg-ink p-8 text-paper focus:outline-none">
        <p className="display text-4xl">Interest registered.</p>
        <p className="mt-4 text-white/80">
          Thanks, {data.name.trim().split(" ")[0]}. You chose the <strong className="text-paper">{track?.name}</strong> track.
          We will contact you at {data.email.trim()} with next steps. No payment has been taken.
        </p>
        <p className="mt-4 text-xs font-bold uppercase tracking-wider text-white/60">Preview: this form does not save data yet.</p>
        <Button type="button" variant="inverse" className="mt-6" onClick={() => { setData({ ...emptyRegistration, track: defaultTrack ?? "" }); setSubmitted(false); }}>
          Start again
        </Button>
      </div>
    );
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate className="grid gap-5 border-2 border-line bg-paper p-6 sm:grid-cols-2 sm:p-8">
      <div className="sm:col-span-2"><TextField id="name" label="Full name" autoComplete="name" value={data.name} onChange={(e) => set("name", e.target.value)} error={errors.name} /></div>
      <TextField id="email" label="Email" type="email" autoComplete="email" value={data.email} onChange={(e) => set("email", e.target.value)} error={errors.email} />
      <TextField id="phone" label="Phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="+91 98765 43210" value={data.phone} onChange={(e) => set("phone", e.target.value)} error={errors.phone} />
      <div className="sm:col-span-2">
        <SelectField id="track" label="Career track" placeholder="Choose a track" options={tracks.map((t) => ({ value: t.slug, label: t.name }))}
          value={data.track} onChange={(e) => set("track", e.target.value as TrackSlug | "")} error={errors.track} />
      </div>
      <SelectField id="currentRole" label="Current role" placeholder="Select role" options={toOptions(roleOptions)} value={data.currentRole} onChange={(e) => set("currentRole", e.target.value)} error={errors.currentRole} />
      <SelectField id="experience" label="Years of experience" placeholder="Select experience" options={toOptions(experienceOptions)} value={data.experience} onChange={(e) => set("experience", e.target.value)} error={errors.experience} />
      <div className="sm:col-span-2">
        <TextField id="linkedin" label="LinkedIn URL" optional type="url" placeholder="https://linkedin.com/in/yourname" value={data.linkedin} onChange={(e) => set("linkedin", e.target.value)} error={errors.linkedin} />
      </div>
      <div className="sm:col-span-2">
        <div className="flex items-start gap-3">
          <input id="consent" type="checkbox" checked={data.consent} onChange={(e) => set("consent", e.target.checked)}
            aria-invalid={!!errors.consent} aria-describedby={errors.consent ? "consent-error" : undefined}
            className="mt-1 size-5 shrink-0 accent-red-strong" />
          <label htmlFor="consent" className="text-sm">
            I agree to be contacted by Klymb.ai about this program by email or phone, and I have read the{" "}
            <a href="/privacy" className="font-semibold underline">Privacy Policy</a>. Questions: {contact.email}
          </label>
        </div>
        {errors.consent && <p id="consent-error" className="mt-1 text-sm font-semibold text-red-deep">{errors.consent}</p>}
      </div>
      <div className="sm:col-span-2">
        <Button type="submit" arrow className="w-full sm:w-auto">Register my interest</Button>
        <p className="mt-3 text-xs text-muted">Registration does not take payment. Payment opens once the cohort is confirmed.</p>
      </div>
    </form>
  );
}
