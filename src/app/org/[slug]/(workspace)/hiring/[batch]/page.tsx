import { notFound, redirect } from "next/navigation";
import { requireCompany } from "@/lib/company/auth";
import { seesHiring } from "@/lib/company/batch-rules";
import { db } from "@/lib/db/client";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Batch pages are gone (U10, user 24 Nov): a round lives on its test's
 * Candidates tab. An old address lands there, on that round, for people of
 * this company who see hiring; anything else is a 404.
 */
export default async function OldBatchPage({ params }: { params: Promise<{ slug: string; batch: string }> }) {
  const { slug, batch } = await params;
  const member = await requireCompany(slug);
  if (!seesHiring(member) || !UUID.test(batch)) notFound();
  const sql = db();
  const found = sql ? await sql.row<{ item: string }>`
    select item from course.hiring_batches where id = ${batch}::uuid and company_id = ${member.companyId}::uuid
  ` : null;
  if (!found?.data) notFound();
  redirect(`/org/${member.companySlug}/assessments/${found.data.item}?tab=candidates&round=${batch}#round-${batch}`);
}
