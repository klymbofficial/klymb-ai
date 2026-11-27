import { redirect } from "next/navigation";

/** Creating a test happens in a modal over the Assessments list (P0.2b); old links open it there. */
export default async function NewTestPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  redirect(`/org/${slug}/assessments?create=1`);
}
