import { redirect } from "next/navigation";

/** Settings opens on the member's own details, as HackerEarth's does. */
export default async function SettingsHome({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  redirect(`/org/${slug.toLowerCase()}/settings/personal`);
}
