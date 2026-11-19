import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { TrackDetail } from "@/components/track/TrackDetail";
import { allTracks as tracks, getTrack } from "@/data/tracks";
import { isListed } from "@/data/course-cards";

export function generateStaticParams() {
  return tracks.filter((t) => t.kind !== "challenge").map((t) => ({ slug: t.slug }));
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
  // Not listed on the live site: the course list instead.
  if (!isListed(track.slug)) redirect("/courses");
  return <TrackDetail track={track} />;
}
