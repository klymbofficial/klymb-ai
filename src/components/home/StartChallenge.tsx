"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { startGoogleRegistration } from "@/app/(register)/register/actions";
import { startChallenge, type StartResult } from "@/app/(register)/register/start-challenge";
import { ChallengeConsent } from "@/components/home/ChallengeConsent";
import { GoogleMark } from "@/components/ui/GoogleMark";
import { contact } from "@/data/config";
import { getTrack } from "@/data/tracks";
import { track as trackEvent } from "@/lib/analytics";
import type { TrackSlug } from "@/types/program";

type Failure = Extract<StartResult, { ok: false }>;

/** Said under a failure, so the person knows what to do next and that nothing was lost. */
const NEXT_STEP: Record<Failure["kind"] | "network", string> = {
  signin: "Sign in again and your challenge starts straight away.",
  limited: "Wait a little, then press Try again.",
  unavailable: "Nothing was lost. Try again in a few minutes.",
  unknown: "Choose a challenge from the Challenges page.",
  network: "Nothing was lost. Check your connection, then press Try again.",
};

/**
 * What a signed-in person sees after choosing a challenge. There is nothing to
 * fill in: arriving here starts the challenge for their Google account and
 * takes them to Day 1. The start happens once, from the browser, as a POST
 * (never while the page is being rendered or prefetched, so merely seeing a
 * link to this page enrols nobody). If it fails, the same step is one press of
 * Try again.
 */
export function StartChallenge({ slug }: { slug: TrackSlug }) {
  const router = useRouter();
  const chosen = getTrack(slug);
  const [failure, setFailure] = useState<{ message: string; kind: Failure["kind"] | "network" } | null>(null);
  const [opening, setOpening] = useState(false);
  const [pending, startTransition] = useTransition();
  const began = useRef(false);

  const begin = useCallback(() => {
    setFailure(null);
    startTransition(async () => {
      try {
        const result = await startChallenge(slug);
        if (!result.ok) {
          setFailure({ message: result.message, kind: result.kind });
          return;
        }
        // Starting a challenge is its registration: keep it in the same GA count the form feeds.
        trackEvent("register_submit", { track_slug: slug, enrolled: true, repeat: !result.created });
        setOpening(true);
        router.replace(result.href);
      } catch {
        setFailure({ message: "We couldn't reach the server.", kind: "network" });
      }
    });
  }, [router, slug]);

  // Once, on arrival. The ref also holds across the development double-run of effects.
  useEffect(() => {
    if (began.current) return;
    began.current = true;
    begin();
  }, [begin]);

  return (
    <div>
      <h2 className="text-2xl font-bold text-balance">
        Start the {chosen ? <span className="text-red-deep">{chosen.name}</span> : null}{chosen?.name.endsWith("Challenge") ? "" : " challenge"}
      </h2>

      {failure ? (
        <div role="alert" className="mt-4 rounded-lg border border-error/30 bg-error-tint/60 px-3 py-2.5 text-sm font-medium text-error">
          <p>{failure.message}</p>
          <p className="mt-1 font-normal text-ink/75">
            {NEXT_STEP[failure.kind]}{" "}
            Still stuck? <a href={`mailto:${contact.email}`} className="font-semibold underline underline-offset-2">{contact.email}</a>
          </p>
          {failure.kind === "signin" ? (
            <form action={startGoogleRegistration} className="mt-3">
              <input type="hidden" name="track" value={slug} />
              <button type="submit" className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-ink ring-1 ring-line/40 hover:bg-paper">
                <GoogleMark /> Sign in with Google
              </button>
            </form>
          ) : (
            <button
              type="button"
              onClick={begin}
              disabled={pending}
              className="mt-3 inline-flex items-center rounded-full bg-red-strong px-5 py-2.5 text-sm font-bold text-white transition-[background-color,transform] duration-150 hover:bg-red-press active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {pending ? "Trying again…" : "Try again"}
            </button>
          )}
        </div>
      ) : (
        <p role="status" className="mt-3 flex items-center gap-3 text-sm text-muted">
          <span aria-hidden="true" className="size-4 shrink-0 animate-spin rounded-full border-2 border-line/40 border-t-red-strong motion-reduce:animate-none" />
          {opening ? "You're in. Opening Day 1…" : "Setting up your Day 1…"}
        </p>
      )}

      <p className="mt-6 text-sm leading-relaxed text-ink/80">
        Nothing to fill in. You&apos;ll add your GitHub and LinkedIn on Day 1, so each day&apos;s work can be checked.
      </p>
      <ChallengeConsent className="mt-3 text-xs text-muted" />
    </div>
  );
}
