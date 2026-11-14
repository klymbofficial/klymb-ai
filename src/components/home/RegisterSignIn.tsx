"use client";

import { useEffect, useState } from "react";
import { startGoogleRegistration } from "@/app/(register)/register/actions";
import { GoogleMark } from "@/components/ui/GoogleMark";
import { getTrack } from "@/data/tracks";
import type { TrackSlug } from "@/types/program";

/**
 * Step one of registering: sign in with Google. Nothing is asked, saved or
 * reserved until this is done, because the registration and the course place
 * belong to the verified Google email, so they can only be made by the person
 * who owns it. The chosen track rides through the sign-in in the return path
 * (a track slug, nothing else), and what is typed afterwards never leaves the
 * page: no name, email, phone or repository goes in an address.
 */
export function RegisterSignIn({
  track, unknownTrack, failed, inApp,
}: { track?: TrackSlug; unknownTrack?: boolean; failed?: boolean; inApp: boolean }) {
  const chosen = track ? getTrack(track) : undefined;
  const [busy, setBusy] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [copied, setCopied] = useState(false);

  // Coming back with the Back button restores the page as it was left, "Opening Google…" included.
  useEffect(() => {
    const reset = (e: PageTransitionEvent) => { if (e.persisted) setBusy(false); };
    window.addEventListener("pageshow", reset);
    return () => window.removeEventListener("pageshow", reset);
  }, []);

  return (
    <div>
      <h2 className="text-2xl font-bold text-balance">
        Start the {chosen ? <span className="text-red-deep">{chosen.name}</span> : null}{chosen?.kind === "challenge" ? (chosen.name.endsWith("Challenge") ? "" : " challenge") : " track"}
      </h2>
      <p className="mt-1 mb-6 text-sm text-muted">
        Start by signing in with Google. Your registration and your course belong to your Google email, so only you can make or change them.
      </p>

      {failed && (
        <p role="alert" className="mb-4 rounded-lg border border-error/30 bg-error-tint/60 px-3 py-2.5 text-sm font-medium text-error">
          Google sign-in did not complete, so nothing was registered. You can try again.
        </p>
      )}
      {unknownTrack && !chosen && (
        <p className="mb-4 rounded-lg border border-line/40 bg-surface/50 px-3 py-2.5 text-sm text-ink/80">
          We didn&apos;t recognise the track in that link. You&apos;ll choose yours after signing in.
        </p>
      )}

      {/* Google refuses sign-in inside app webviews, so stop before the trip rather than end on its error. */}
      <form
        action={startGoogleRegistration}
        onSubmit={(e) => {
          if (inApp) { e.preventDefault(); setBlocked(true); return; }
          setBusy(true);
        }}
      >
        <input type="hidden" name="track" value={track ?? ""} />
        <button
          type="submit"
          disabled={busy}
          aria-busy={busy}
          className="inline-flex w-full items-center justify-center gap-3 rounded-full bg-red-strong px-6 py-3.5 text-sm font-bold text-white transition-[background-color,transform] duration-150 hover:bg-red-press active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
        >
          <span aria-hidden="true" className="grid size-6 place-items-center rounded-full bg-white"><GoogleMark /></span>
          {busy ? "Opening Google…" : "Continue with Google"}
        </button>
        <p role="status" className="sr-only">{busy ? "Opening Google…" : ""}</p>
      </form>

      {blocked && (
        <div role="alert" className="mt-4 flex flex-col gap-2 rounded-lg border border-error/30 bg-error-tint/60 px-3 py-2.5 text-sm font-medium text-error">
          Google sign-in doesn&apos;t work inside this app. Open the ⋯ menu and choose Open in Chrome or Open in Safari.
          <button type="button" onClick={() => void navigator.clipboard?.writeText(window.location.href).then(() => setCopied(true))} className="self-start underline underline-offset-2">
            {copied ? "Link copied" : "Copy the link"}
          </button>
        </div>
      )}

      <div className="mt-8">
        <h3 className="text-xs font-extrabold uppercase tracking-[0.16em] text-muted">What happens next</h3>
        <ol className="mt-3 space-y-2.5 text-sm leading-relaxed text-ink/80">
          <li className="flex gap-3"><span aria-hidden="true" className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-surface text-[11px] font-bold nums">1</span>Sign in with Google. Nothing is saved yet.</li>
          <li className="flex gap-3"><span aria-hidden="true" className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-surface text-[11px] font-bold nums">2</span>Add a few details: about a minute. Your name and email come from Google.</li>
          <li className="flex gap-3"><span aria-hidden="true" className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-surface text-[11px] font-bold nums">3</span>You register, and your course opens on the same account.</li>
        </ol>
        <p className="mt-4 text-xs text-muted">If you back out at Google, nothing is registered or reserved.</p>
      </div>
    </div>
  );
}
