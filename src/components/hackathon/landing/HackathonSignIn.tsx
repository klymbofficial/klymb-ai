"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { signInForHackathon } from "@/app/(site)/hackathons/actions";
import { GoogleMark } from "@/components/ui/GoogleMark";

const COPY = {
  register: { title: "Sign in to register", body: "We use your Google account so your team, its code and your entry stay yours. You don't need to have bought a course." },
  notify: { title: "Sign in to get notified", body: "We'll email the Google account you sign in with the moment registration opens." },
  team: { title: "Sign in", body: "Use the Google account you registered with." },
} as const;

/**
 * The hackathon page's Google sign-in. Google refuses to sign anyone in from
 * an app's own browser (Instagram, LinkedIn…), so there it stops before the
 * trip and says how to open the page in a real browser instead.
 */
export function HackathonSignIn({ purpose, inAppBrowser, failed, bare = false }: { purpose: keyof typeof COPY; inAppBrowser: boolean; failed: boolean; /** Inside another card: no card or heading of its own. */ bare?: boolean }) {
  const [blocked, setBlocked] = useState(false);
  const [copied, setCopied] = useState(false);
  const [pending, setPending] = useState(false);
  const c = COPY[purpose];
  // Back from Google's page restores this one from the cache, button and all: let it be pressed again.
  useEffect(() => {
    const reset = (e: PageTransitionEvent) => { if (e.persisted) setPending(false); };
    window.addEventListener("pageshow", reset);
    return () => window.removeEventListener("pageshow", reset);
  }, []);

  return (
    <div className={bare ? "" : "hk-card max-w-xl"}>
      {!bare && <h3 className="text-lg font-extrabold text-ink">{c.title}</h3>}
      {!bare && <p className="mt-1 text-sm text-muted">{c.body}</p>}
      {failed && (
        <p role="alert" className="mt-4 border-2 border-error bg-error-tint p-3 text-sm font-semibold text-error">
          Google sign-in didn&apos;t finish. Try again, and pick the account you want to register with.
        </p>
      )}
      <form
        action={signInForHackathon}
        className={bare ? "" : "mt-5"}
        onSubmit={(e) => {
          if (inAppBrowser) { e.preventDefault(); setBlocked(true); return; }
          setPending(true);
        }}
      >
        <button
          type="submit"
          disabled={pending}
          aria-busy={pending}
          className="inline-flex w-full items-center justify-center gap-3 rounded-full border border-line/50 bg-white px-4 py-3 text-sm font-bold text-ink shadow-card transition-colors hover:bg-surface disabled:opacity-70 sm:w-auto sm:px-8"
        >
          <GoogleMark />
          {pending ? "Opening Google…" : "Continue with Google"}
        </button>
      </form>
      {blocked && (
        <div role="alert" className="mt-4 flex flex-col gap-2 border-2 border-error bg-error-tint p-3 text-sm font-semibold text-error">
          Google sign-in doesn&apos;t work inside this app. Open the ⋯ menu and choose Open in Chrome or Open in Safari.
          <button type="button" onClick={() => void navigator.clipboard?.writeText(window.location.href).then(() => setCopied(true))} className="self-start underline underline-offset-2">
            {copied ? "Link copied" : "Copy the link"}
          </button>
        </div>
      )}
      <p className="mt-4 text-xs text-muted">
        By continuing you agree to the <Link href="/privacy" className="underline underline-offset-2">Privacy Policy</Link> and to hear from us about the hackathon by email.
      </p>
    </div>
  );
}
