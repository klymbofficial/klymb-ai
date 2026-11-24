import { redirect } from "next/navigation";

/** Catalog became the Library (L1): questions in the Library, courses under Upskill, tests on Assessments. Old links land on the Library. */
export default async function CatalogMoved({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  redirect(`/org/${encodeURIComponent(slug)}/library`);
}
