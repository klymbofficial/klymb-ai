"use client";

import { useActionState, useState } from "react";
import { signInWithPassword, signOut } from "@/app/admin/actions";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/FormField";
import { createClient } from "@/lib/supabase/client";

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#4285F4" d="M45 24c0-1.6-.1-2.7-.4-3.9H24v7.1h12c-.2 1.9-1.5 4.7-4.4 6.6l6.8 5.3C42.4 35.5 45 30.3 45 24z" />
      <path fill="#34A853" d="M24 46c5.9 0 10.8-1.9 14.4-5.3l-6.8-5.3c-1.8 1.3-4.3 2.2-7.6 2.2-5.8 0-10.7-3.8-12.5-9.1l-7 5.4C8.1 41 15.4 46 24 46z" />
      <path fill="#FBBC05" d="M11.5 28.5c-.5-1.4-.7-2.9-.7-4.5s.3-3.1.7-4.5l-7-5.4C3.6 17 3 20.4 3 24s.6 7 2.5 9.9l6-5.4z" />
      <path fill="#EA4335" d="M24 10.6c4.1 0 6.9 1.8 8.5 3.3l6.2-6C34.8 4.4 29.9 2 24 2 15.4 2 8.1 7 5.5 14.1l7 5.4C14.3 14.2 19.2 10.6 24 10.6z" />
    </svg>
  );
}

export function LoginForm({ error, signedInAs }: { error?: string; signedInAs?: string | null }) {
  const [state, action, pending] = useActionState(signInWithPassword, null as { error?: string } | null);
  const [googlePending, setGooglePending] = useState(false);
  const [googleError, setGoogleError] = useState("");

  async function signInWithGoogle() {
    setGoogleError("");
    setGooglePending(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) throw error;
    } catch {
      setGoogleError("Google sign-in is not available yet. Use your email and password.");
      setGooglePending(false);
    }
  }

  if (signedInAs) {
    return (
      <form action={signOut}>
        <Button type="submit" variant="secondary" className="w-full">Sign out</Button>
      </form>
    );
  }

  const message = state?.error ?? error ?? googleError;

  return (
    <div className="mt-6 flex flex-col gap-5">
      <button
        type="button"
        onClick={signInWithGoogle}
        disabled={googlePending}
        className="inline-flex items-center justify-center gap-3 border-2 border-ink bg-white px-4 py-3 text-sm font-bold text-ink transition-colors hover:bg-surface disabled:opacity-60"
      >
        <GoogleMark />
        {googlePending ? "Opening Google…" : "Continue with Google"}
      </button>

      <div className="flex items-center gap-3 text-[11px] font-extrabold uppercase tracking-[0.14em] text-muted">
        <span className="h-px flex-1 bg-line" />or<span className="h-px flex-1 bg-line" />
      </div>

      <form action={action} className="flex flex-col gap-4">
        <TextField id="email" label="Email" type="email" autoComplete="email" placeholder="you@klymb.ai" />
        <TextField id="password" label="Password" type="password" autoComplete="current-password" />
        {message && <p role="alert" className="border-2 border-red-deep bg-red-tint p-3 text-sm font-semibold text-red-deep">{message}</p>}
        <Button type="submit" disabled={pending} aria-busy={pending}>{pending ? "Signing in…" : "Sign in"}</Button>
      </form>
    </div>
  );
}
