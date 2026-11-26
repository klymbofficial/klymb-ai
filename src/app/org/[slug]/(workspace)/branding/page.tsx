import { redirect } from "next/navigation";

/** Branding moved into Settings → Company Information (user, 26 Nov); old links still arrive there. */
export default async function BrandingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  redirect(`/org/${slug.toLowerCase()}/settings/company`);
}
