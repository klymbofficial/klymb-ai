"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { challengeStatus, signInToEnroll, startChallenge } from "@/app/(register)/register/start-challenge";
import { ChallengeConsent } from "@/components/home/ChallengeConsent";
import { contact } from "@/data/config";
import { track as trackEvent } from "@/lib/analytics";
import { inAppBrowser } from "@/lib/sd-offer";

/**
 * Enrolling on a challenge from its own page. Signed in, one press makes the
 * place and the button turns into "You're enrolled". Signed out, the press
 * goes to Google and comes back to the same page, which then finishes the job.
 *
 * Only a press enrols: what asks for it after Google is a note this tab keeps,
 * never anything in the address, so a shared link can't enrol anyone.
 */
const INTENT_KEY = "klymb.enroll";

const rememberPress = (slug: string) => {
  try { window.sessionStorage.setItem(INTENT_KEY, slug); } catch { /* They press once more after signing in. */ }
};

/** Whether they pressed Enroll before leaving for Google. Read once, then forgotten. */
const takePress = (slug: string) => {
  try {
    if (window.sessionStorage.getItem(INTENT_KEY) !== slug) return false;
    window.sessionStorage.removeItem(INTENT_KEY);
    return true;
  } catch {
    return false;
  }
};

export type Enrollment = {
  slug: string;
  phase: "idle" | "working" | "enrolled" | "other-device";
  error: string | null;
  enroll: () => void;
};

export function useChallengeEnrollment(slug: string): Enrollment {
  const [phase, setPhase] = useState<Enrollment["phase"]>("idle");
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const arrived = useRef(false);

  const run = useCallback((pressed: boolean) => {
    setError(null);
    setPhase("working");
    startTransition(async () => {
      let result;
      try {
        result = await startChallenge(slug);
      } catch {
        setPhase("idle");
        setError("We couldn't reach the server. Check your connection, then try again.");
        return;
      }
      if (result.ok) {
        // Enrolling on a challenge is its registration: keep it in the same GA count the form feeds.
        trackEvent("register_submit", { track_slug: slug, enrolled: true, repeat: !result.created });
        setPhase("enrolled");
        return;
      }
      if (result.kind !== "signin") {
        setPhase("idle");
        setError(`${result.message} Please try again.`);
        return;
      }
      // Back from Google without signing in: nothing to do until they press again.
      if (!pressed) {
        setPhase("idle");
        return;
      }
      // Google refuses sign-in inside app webviews, so stop before the trip rather than end on its error.
      if (inAppBrowser(navigator.userAgent)) {
        setPhase("idle");
        setError("Google sign-in doesn't work inside this app. Open the ⋯ menu and choose Open in Chrome or Open in Safari.");
        return;
      }
      rememberPress(slug);
      await signInToEnroll(slug);
    });
  }, [slug]);

  // Once, on arrival: finish a press made before signing in, or else show whether they are already on it.
  useEffect(() => {
    if (arrived.current) return;
    arrived.current = true;
    const failed = new URLSearchParams(window.location.search).get("signin") === "failed";
    const pressed = takePress(slug);
    startTransition(async () => {
      if (failed) {
        setError("Google sign-in did not complete, so you are not enrolled yet. You can try again.");
        return;
      }
      if (pressed) return run(false);
      const status = await challengeStatus(slug).catch(() => "none" as const);
      if (status !== "none") setPhase(status);
    });
  }, [run, slug]);

  // Coming back from Google with the Back button restores the page as it was left, "Enrolling…" included.
  useEffect(() => {
    const reset = (e: PageTransitionEvent) => { if (e.persisted) setPhase("idle"); };
    window.addEventListener("pageshow", reset);
    return () => window.removeEventListener("pageshow", reset);
  }, []);

  const enroll = useCallback(() => run(true), [run]);
  return { slug, phase, error, enroll };
}

/** The Enroll button and everything that takes its place, in the colour of whatever it sits on. */
export function EnrollControl({
  enrollment: { slug, phase, error, enroll }, opens, className, children,
}: {
  enrollment: Enrollment;
  /** "5 December" while the challenge has not opened. */
  opens: string | null;
  /** The button's own look. */
  className: string;
  children: React.ReactNode;
}) {
  if (phase === "enrolled") {
    return (
      <div role="status" className="flex max-w-sm flex-col gap-1">
        <p className="text-lg font-extrabold">✓ You&apos;re enrolled.</p>
        <p className="text-sm font-semibold">{opens ? `Day 1 opens ${opens}.` : "Day 1 is open."}</p>
        <Link href={opens ? "/dashboard" : `/learn/tracks/${slug}`} className="text-sm font-bold underline underline-offset-4">
          {opens ? "Go to your dashboard" : "Open your challenge"}
        </Link>
      </div>
    );
  }

  if (phase === "other-device") {
    return (
      <p role="status" className="max-w-sm text-sm font-semibold">
        You&apos;re signed in on another device. <Link href="/dashboard" className="font-bold underline underline-offset-4">Continue on this one</Link>
      </p>
    );
  }

  return (
    <div className="flex max-w-sm flex-col gap-2">
      <button type="button" onClick={enroll} disabled={phase === "working"} aria-busy={phase === "working"} className={className}>
        {phase === "working" ? "Enrolling…" : children}
      </button>
      {opens && <p className="text-sm font-bold">Day 1 opens {opens}.</p>}
      {error && (
        <p role="alert" className="rounded-lg bg-white px-3 py-2 text-sm font-medium text-error">
          {error} Still stuck? <a href={`mailto:${contact.email}`} className="font-semibold underline underline-offset-2">{contact.email}</a>
        </p>
      )}
      <ChallengeConsent className="text-xs opacity-80" />
    </div>
  );
}

/** The whole thing in one piece, for a page that has a single Enroll button. */
export function ChallengeEnroll({ slug, opens, className, children }: { slug: string; opens: string | null; className: string; children: React.ReactNode }) {
  return <EnrollControl enrollment={useChallengeEnrollment(slug)} opens={opens} className={className}>{children}</EnrollControl>;
}
