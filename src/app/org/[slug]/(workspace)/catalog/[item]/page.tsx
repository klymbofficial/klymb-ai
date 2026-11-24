import { redirect } from "next/navigation";
import { codeItem } from "@/data/business-catalog";

/** An old catalog link (before L1): a test opens on Assessments, a course or program under Upskill's courses. */
export default async function CatalogItemMoved({ params }: { params: Promise<{ slug: string; item: string }> }) {
  const { slug, item } = await params;
  const company = `/org/${encodeURIComponent(slug)}`;
  const kind = codeItem(item)?.kind;
  redirect(kind === "assessment" || item.startsWith("t-") ? `${company}/assessments/${encodeURIComponent(item)}` : `${company}/learning/courses/${encodeURIComponent(item)}`);
}
