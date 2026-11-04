"use client";

import { useActionState } from "react";
import { saveProfileAction, type ProfileFormState } from "@/app/(learn)/learn/profile/actions";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/FormField";
import type { Profile } from "@/lib/profile-score";

function Group({ title, intro, children }: { title: string; intro?: string; children: React.ReactNode }) {
  return (
    <fieldset className="card p-6 sm:p-7">
      <legend className="sr-only">{title}</legend>
      <h2 className="text-lg font-extrabold" aria-hidden="true">{title}</h2>
      {intro && <p className="mt-1 text-sm text-muted">{intro}</p>}
      <div className="mt-5 grid gap-4 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}

/** The profile, in the same sections the score uses. Every field is optional; the score says what is missing. */
export function ProfileForm({ profile }: { profile: Profile }) {
  const [state, action, pending] = useActionState<ProfileFormState, FormData>(saveProfileAction, null);
  const e = state?.errors ?? {};
  // After a save that didn't go through, the form shows what they typed rather than the saved values.
  const v = state?.values;
  const val = (k: keyof Profile, saved: string | number | null) => v?.[k] ?? (saved ?? "");
  const v0 = v ? v.status ?? "" : undefined;
  return (
    <form key={v ? JSON.stringify(v) : "saved"} action={action} className="flex flex-col gap-5" noValidate>
      <Group title="About you">
        <TextField id="name" label="Full name" optional defaultValue={val("name", profile.name)} autoComplete="name" error={e.name} />
        <TextField id="headline" label="Headline" optional defaultValue={val("headline", profile.headline)} placeholder="Final-year CS student building AI tools" error={e.headline} />
        <TextField id="phone" label="Phone" optional type="tel" defaultValue={val("phone", profile.phone)} autoComplete="tel" error={e.phone} />
        <TextField id="city" label="Current city" optional defaultValue={val("city", profile.city)} autoComplete="address-level2" error={e.city} />
        <div className="sm:col-span-2">
          <p className="text-[13px] font-bold">Right now I am <span className="font-normal text-muted">(optional)</span></p>
          <div className="mt-2 flex flex-wrap gap-4 text-sm">
            {([["student", "A student or recent graduate"], ["working", "Working"]] as const).map(([value, l]) => (
              <label key={value} className="inline-flex items-center gap-2"><input type="radio" name="status" value={value} defaultChecked={(v0 ?? profile.status) === value} />{l}</label>
            ))}
          </div>
        </div>
      </Group>

      <Group title="Education">
        <TextField id="institution" label="College or school" optional defaultValue={val("institution", profile.institution)} error={e.institution} />
        <TextField id="degree" label="Degree" optional defaultValue={val("degree", profile.degree)} placeholder="B.Tech Computer Science" error={e.degree} />
        <TextField id="graduationYear" label="Graduation year" optional inputMode="numeric" defaultValue={val("graduationYear", profile.graduationYear)} placeholder="2026" error={e.graduationYear} />
      </Group>

      <Group title="Experience" intro="Your most recent role or internship. Still studying? Tick the box: it completes this section.">
        <TextField id="jobRole" label="Role" optional defaultValue={val("jobRole", profile.jobRole)} error={e.jobRole} />
        <TextField id="company" label="Company" optional defaultValue={val("company", profile.company)} autoComplete="organization" error={e.company} />
        <label className="inline-flex items-center gap-2 text-sm sm:col-span-2">
          <input type="checkbox" name="noExperience" defaultChecked={v ? v.noExperience === "on" : profile.noExperience} /> I have no work experience yet
        </label>
      </Group>

      <Group title="Skills" intro="Separate them with commas. Three or more completes this section.">
        <div className="sm:col-span-2">
          <TextField id="skills" label="Skills" optional defaultValue={val("skills", profile.skills.join(", "))} placeholder="Python, SQL, React" error={e.skills} />
        </div>
      </Group>

      <Group title="Links">
        <TextField id="githubUsername" label="GitHub" optional defaultValue={val("githubUsername", profile.githubUsername)} placeholder="https://github.com/your-username" error={e.githubUsername} />
        <TextField id="linkedinSlug" label="LinkedIn" optional defaultValue={val("linkedinSlug", profile.linkedinSlug)} placeholder="https://www.linkedin.com/in/yourname" error={e.linkedinSlug} />
        <div className="sm:col-span-2">
          <TextField id="portfolioUrl" label="Portfolio or résumé link" optional type="url" defaultValue={val("portfolioUrl", profile.portfolioUrl)} placeholder="https://" error={e.portfolioUrl} />
        </div>
      </Group>

      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" disabled={pending} aria-busy={pending} className="rounded-md px-5! py-2.5! text-xs!">{pending ? "Saving…" : "Save profile"}</Button>
        {state?.saved && !pending && <p role="status" className="text-sm font-bold text-red-deep">Saved.</p>}
        {state?.message && !pending && <p role="alert" className="text-sm font-semibold text-error">{state.message}</p>}
      </div>
    </form>
  );
}
