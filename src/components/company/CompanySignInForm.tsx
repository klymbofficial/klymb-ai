"use client";

import { useActionState, useRef, useState } from "react";
import { companySignIn, type SignInState } from "@/app/org/sign-in/actions";
import { Button } from "@/components/ui/Button";

const input =
  "block w-full rounded-md border border-line/40 bg-card px-3 py-2.5 text-sm transition-[border-color,box-shadow] duration-200 placeholder:text-muted/70 hover:border-line/70 focus:border-ink/60 focus:ring-4 focus:ring-ink/5 focus:outline-none";

/**
 * The email and password, or (for a first sign-in or a forgotten password)
 * the email and then the 6-digit code sent to it. `next`
 * (already checked by the page) rides along in both steps; the action checks
 * it again before following it.
 */
export function CompanySignInForm({ next }: { next?: string | null }) {
  const [state, action, pending] = useActionState(companySignIn, { step: "email" } as SignInState);
  const [method, setMethod] = useState<"password" | "code">("password");
  const email = useRef<HTMLInputElement>(null);

  return (
    <form action={action} className="mt-6 flex flex-col gap-4" noValidate>
      {next && <input type="hidden" name="next" value={next} />}
      {state.step === "email" ? (
        <>
          <label className="flex flex-col gap-1.5 text-sm font-bold text-ink">
            Work email
            <input
              ref={email}
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
          {method === "password" ? (
            <>
              <label className="flex flex-col gap-1.5 text-sm font-bold text-ink">
                Password
                <input
                  key="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  maxLength={128}
                  className={input}
                />
              </label>
              {/* First in the form, so Enter signs in with the password. */}
              <Button type="submit" name="intent" value="password" disabled={pending} className="w-full">
                {pending ? "Signing in..." : "Sign in"}
              </Button>
              <p className="flex flex-wrap items-center justify-center gap-x-1.5 text-xs text-muted">
                No password yet, or forgot it?
                <button
                  type="submit"
                  name="intent"
                  value="request"
                  disabled={pending}
                  onClick={(event) => {
                    // With no address yet, switch the form to its code flow instead of
                    // submitting a password-shaped form and showing "Enter your email".
                    if (email.current?.value.trim()) return;
                    event.preventDefault();
                    setMethod("code");
                    requestAnimationFrame(() => email.current?.focus());
                  }}
                  className="font-semibold text-ink underline underline-offset-2 disabled:opacity-60"
                >
                  Email me a code
                </button>
              </p>
            </>
          ) : (
            <>
              <p className="text-sm text-muted">Enter your work email and we&apos;ll send a 6-digit sign-in code.</p>
              <Button type="submit" name="intent" value="request" disabled={pending} className="w-full">
                {pending ? "Sending..." : "Send sign-in code"}
              </Button>
              <button type="button" onClick={() => setMethod("password")} disabled={pending} className="self-center text-xs font-semibold text-muted underline underline-offset-2 disabled:opacity-60">
                Use my password instead
              </button>
            </>
          )}
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
