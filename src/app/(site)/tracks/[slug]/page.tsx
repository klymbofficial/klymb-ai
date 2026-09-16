import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TrackDetail } from "@/components/track/TrackDetail";
import { getTrack, tracks } from "@/data/tracks";

export function generateStaticParams() {
  return tracks.map((t) => ({ slug: t.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const track = getTrack((await params).slug);
  return track ? { title: `${track.name} Track`, description: track.description } : {};
}

export default async function TrackPage({ params }: { params: Promise<{ slug: string }> }) {
  const track = getTrack((await params).slug);
  if (!track) notFound();
  return <TrackDetail track={track} />;
}
