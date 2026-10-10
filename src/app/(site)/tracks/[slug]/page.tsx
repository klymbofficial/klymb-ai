import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TrackDetail } from "@/components/track/TrackDetail";
import { allTracks as tracks, getTrack } from "@/data/tracks";

export function generateStaticParams() {
  return tracks.map((t) => ({ slug: t.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const track = getTrack((await params).slug);
  if (!track) return {};
  // Invite-only tracks stay out of search results until they are listed.
  return { title: `${track.name} Track`, description: track.description, ...(track.listed === false && { robots: { index: false, follow: false } }) };
}

export default async function TrackPage({ params }: { params: Promise<{ slug: string }> }) {
  const track = getTrack((await params).slug);
  if (!track) notFound();
  return <TrackDetail track={track} />;
}
