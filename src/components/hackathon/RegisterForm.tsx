"use client";

import { useActionState, useState } from "react";
import { registerForHackathon, type FormResult } from "@/app/(learn)/learn/hackathon/actions";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/FormField";

/** Solo, a new team, or joining one by its code: one form, the person's details prefilled from their profile. */
export function RegisterForm({ defaults, maxTeamSize }: { defaults: { name: string; phone: string; college: string; graduationYear: string }; maxTeamSize: number }) {
  const [state, action, pending] = useActionState<FormResult, FormData>(registerForHackathon, null);
  const v = state?.values;
  const [mode, setMode] = useState<"create" | "join">(v?.mode === "join" ? "join" : "create");
  const e = state?.errors ?? {};
  return (
    <form key={v ? JSON.stringify(v) : "new"} action={action} className="card flex flex-col gap-6 p-6 sm:p-8" noValidate>
      <fieldset>
        <legend className="text-lg font-extrabold">How are you entering?</legend>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {([["create", "Solo, or start a team", `You'll get a code to share with up to ${maxTeamSize - 1} teammates.`], ["join", "Join a team", "Your team leader gives you a 6-character code."]] as const).map(([m, title, body]) => (
            <label key={m} className={`flex cursor-pointer gap-3 rounded-lg border p-4 ${mode === m ? "border-ink bg-surface" : "border-line/40"}`}>
              <input type="radio" name="mode" value={m} checked={mode === m} onChange={() => setMode(m)} className="mt-1" />
              <span><span className="block font-bold">{title}</span><span className="mt-0.5 block text-sm text-muted">{body}</span></span>
            </label>
          ))}
        </div>
      </fieldset>

      {mode === "create"
        ? <TextField id="teamName" label="Team name" optional defaultValue={v?.teamName ?? ""} placeholder="Leave empty if you're solo" />
        : <TextField id="code" label="Team code" defaultValue={v?.code ?? ""} placeholder="ABC234" autoCapitalize="characters" maxLength={8} error={e.code} />}

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField id="name" label="Full name" defaultValue={v?.name ?? defaults.name} autoComplete="name" error={e.name} />
        <TextField id="phone" label="Phone" type="tel" defaultValue={v?.phone ?? defaults.phone} autoComplete="tel" error={e.phone} />
        <TextField id="college" label="College" defaultValue={v?.college ?? defaults.college} error={e.college} />
        <TextField id="graduationYear" label="Graduation year" inputMode="numeric" defaultValue={v?.graduationYear ?? defaults.graduationYear} placeholder="2027" error={e.graduationYear} />
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" soft disabled={pending} aria-busy={pending}>{pending ? "Registering…" : mode === "join" ? "Join the team" : "Register"}</Button>
        {state?.message && !pending && <p role="alert" className="text-sm font-semibold text-error">{state.message}</p>}
      </div>
    </form>
  );
}
