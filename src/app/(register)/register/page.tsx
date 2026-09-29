import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth, verifiedEmailFrom } from "@/auth";
import { RegisterSection } from "@/components/home/RegisterSection";
import { trackSlugs } from "@/data/tracks";
import { getLearnerState } from "@/lib/learner/data";
import type { TrackSlug } from "@/types/program";

export const metadata: Metadata = { title: "Register" };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ track?: string }> }) {
  const { track } = await searchParams;
  const defaultTrack = trackSlugs.includes(track as TrackSlug) ? (track as TrackSlug) : undefined;

  // Back from "Register with Google". Someone already enrolled has nothing to
  // fill in: send them to their course rather than a form they have done.
  const session = await auth();
  const email = verifiedEmailFrom(session);
  if (email && (await getLearnerState()).state === "enrolled") redirect("/learn");

  const googleUser = email
    ? { email, name: session?.user?.name ?? "", image: session?.user?.image ?? null }
    : undefined;

  // TODO(Razorpay): payment step goes after registration. No payment logic exists yet.
  return <RegisterSection defaultTrack={defaultTrack} googleUser={googleUser} />;
}
