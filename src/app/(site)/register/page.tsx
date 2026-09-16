import type { Metadata } from "next";
import { RegisterSection } from "@/components/home/RegisterSection";
import { trackSlugs } from "@/data/tracks";
import type { TrackSlug } from "@/types/program";

export const metadata: Metadata = { title: "Register" };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ track?: string }> }) {
  const { track } = await searchParams;
  const defaultTrack = trackSlugs.includes(track as TrackSlug) ? (track as TrackSlug) : undefined;
  // TODO(Razorpay): payment step goes after registration. No payment logic exists yet.
  return <RegisterSection defaultTrack={defaultTrack} />;
}
