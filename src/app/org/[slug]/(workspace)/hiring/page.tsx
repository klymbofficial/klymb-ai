import { redirect } from "next/navigation";

/**
 * There is no separate batch list any more (user, 24 Nov: like HackerEarth,
 * tests are the hub). Old links land on Assessments, where each test's
 * Candidates tab shows everyone invited to it.
 */
export default async function HiringPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  redirect(`/org/${slug}/assessments`);
}
