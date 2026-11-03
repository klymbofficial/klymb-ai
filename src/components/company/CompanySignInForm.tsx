"use client";

import { useActionState } from "react";
import { companySignIn, type SignInState } from "@/app/org/sign-in/actions";
import { Button } from "@/components/ui/Button";

const input =
  "block w-full rounded-md border border-line/40 bg-card px-3 py-2.5 text-sm transition-[border-color,box-shadow] duration-200 placeholder:text-muted/70 hover:border-line/70 focus:border-ink/60 focus:ring-4 focus:ring-ink/5 focus:outline-none";

/** Two steps on one page: the email, then the 6-digit code sent to it. */
export function CompanySignInForm() {
  const [state, action, pending] = useActionState(companySignIn, { step: "email" } as SignInState);

  return (
    <form action={action} className="mt-6 flex flex-col gap-4" noValidate>
      {state.step === "email" ? (
        <>
          <label className="flex flex-col gap-1.5 text-sm font-bold text-ink">
            Work email
            <input
              key="email"
              name="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              required
              defaultValue={state.email}
              placeholder="you@company.com"
              className={input}
            />
          </label>
          <Button type="submit" name="intent" value="request" disabled={pending} className="w-full">
            {pending ? "Sending..." : "Email me a code"}
          </Button>
        </>
      ) : (
        <>
          <input type="hidden" name="email" value={state.email ?? ""} />
          {state.message && <p role="status" className="text-sm text-muted">{state.message}</p>}
          <label className="flex flex-col gap-1.5 text-sm font-bold text-ink">
            6-digit code
            <input
              key="code"
              name="code"
              type="text"
              autoComplete="one-time-code"
              inputMode="numeric"
              pattern="[0-9 \-]*"
              maxLength={9}
              required
              autoFocus
              placeholder="123456"
              className={`${input} font-mono tracking-[0.3em]`}
            />
          </label>
          <Button type="submit" name="intent" value="verify" disabled={pending} className="w-full">
            {pending ? "Checking..." : "Sign in"}
          </Button>
          <div className="flex justify-between gap-4 text-xs">
            <button type="submit" name="intent" value="request" disabled={pending} className="font-semibold text-ink underline underline-offset-2 disabled:opacity-60">
              Send a new code
            </button>
            <button type="submit" name="intent" value="restart" disabled={pending} className="font-semibold text-muted underline underline-offset-2 disabled:opacity-60">
              Use a different email
            </button>
          </div>
        </>
      )}
      {state.error && <p role="alert" className="border-2 border-error bg-error-tint p-3 text-sm font-semibold text-error">{state.error}</p>}
    </form>
  );
}
