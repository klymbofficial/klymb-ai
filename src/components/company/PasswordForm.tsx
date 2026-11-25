"use client";

import { useActionState, useState } from "react";
import { changeMyPassword, type PasswordFormState } from "@/app/org/[slug]/(workspace)/settings/actions";
import { Button } from "@/components/ui/Button";
import type { ChangeField } from "@/lib/company/password-rules";

const input =
  "block w-full rounded-md border border-line/40 bg-card px-3 py-2.5 text-sm transition-[border-color,box-shadow] duration-200 placeholder:text-muted/70 hover:border-line/70 focus:border-ink/60 focus:ring-4 focus:ring-ink/5 focus:outline-none aria-[invalid=true]:border-error";

/**
 * Sets a first password or changes the current one. The current password is
 * asked for only when the page says so (see needsCurrentPassword); the action
 * checks again on its own.
 */
export function PasswordForm({ slug, email, hasPassword, askCurrent, minLength }: {
  slug: string;
  email: string;
  hasPassword: boolean;
  askCurrent: boolean;
  minLength: number;
}) {
  const [state, action, pending] = useActionState<PasswordFormState, FormData>(changeMyPassword.bind(null, slug), null);
  const [show, setShow] = useState(false);
  const errorOn = (field: ChangeField) => (state && !state.ok && state.field === field ? state.message : null);
  const type = show ? "text" : "password";

  const field = (name: ChangeField, label: string, autoComplete: string, hint?: string) => {
    const error = errorOn(name);
    return (
      <label className="flex flex-col gap-1.5 text-sm font-bold text-ink">
        {label}
        <input
          name={name}
          type={type}
          autoComplete={autoComplete}
          maxLength={128}
          required
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${name}-error` : hint ? `${name}-hint` : undefined}
          className={input}
        />
        {error
          ? <span id={`${name}-error`} className="text-xs font-semibold text-error">{error}</span>
          : hint && <span id={`${name}-hint`} className="text-xs font-normal text-muted">{hint}</span>}
      </label>
    );
  };

  return (
    // React clears the fields after every submit, so typed passwords don't linger on the page.
    <form action={action} className="mt-5 flex max-w-md flex-col gap-4" noValidate>
      {/* For password managers: the account this password belongs to. */}
      <input type="email" name="username" autoComplete="username" value={email} readOnly hidden />
      {askCurrent && field("current", "Current password", "current-password")}
      {field("next", hasPassword ? "New password" : "Password", "new-password", `At least ${minLength} characters.`)}
      {field("confirm", hasPassword ? "Confirm new password" : "Confirm password", "new-password")}
      <label className="flex items-center gap-2 text-sm text-muted">
        <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} className="h-4 w-4 accent-[var(--color-ink)]" />
        Show passwords
      </label>
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving..." : hasPassword ? "Change password" : "Set password"}
        </Button>
      </div>
      {state?.ok && <p role="status" className="border-2 border-ink p-3 text-sm font-semibold text-ink">{state.message}</p>}
      {state && !state.ok && !state.field && <p role="alert" className="border-2 border-error bg-error-tint p-3 text-sm font-semibold text-error">{state.message}</p>}
    </form>
  );
}
