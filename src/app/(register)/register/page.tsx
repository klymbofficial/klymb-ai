import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth, verifiedEmailFrom } from "@/auth";
import { RegisterSection } from "@/components/home/RegisterSection";
import { trackSlugs } from "@/data/tracks";
import { getLearnerState } from "@/lib/learner/data";
import { inAppBrowser } from "@/lib/sd-offer";
import type { TrackSlug } from "@/types/program";

export const metadata: Metadata = { title: "Register" };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ track?: string; signin?: string }> }) {
  const { track, signin } = await searchParams;
  const defaultTrack = trackSlugs.includes(track as TrackSlug) ? (track as TrackSlug) : undefined;
  // A link that names a track we do not have: say so, rather than showing an empty picker with no explanation.
  const unknownTrack = !!track && !defaultTrack;

  // Back from Google. Someone already enrolled has nothing to
  // fill in: send them to their course rather than a form they have done. On
  // another device the course page says so and offers to continue here.
  const session = await auth();
  const email = verifiedEmailFrom(session);
  if (email) {
    const { state } = await getLearnerState();
    if (state === "enrolled" || state === "other-device") redirect("/learn");
  }

  const googleUser = email
    ? { email, name: session?.user?.name ?? "", image: session?.user?.image ?? null }
    : undefined;

  // TODO(Razorpay): payment step goes after registration. No payment logic exists yet.
  return (
    <RegisterSection
      defaultTrack={defaultTrack}
      googleUser={googleUser}
      unknownTrack={unknownTrack}
      signInFailed={signin === "failed"}
      inApp={inAppBrowser((await headers()).get("user-agent") ?? "")}
    />
  );
}
