import { allowCompany } from "@/lib/company/access";
import { getWorkspaceMember } from "@/lib/company/auth";
import { getAttemptFile } from "@/lib/company/attempt-storage";
import { seesHiring } from "@/lib/company/batch-rules";
import { submittedFile } from "@/lib/company/review-data";
import { db } from "@/lib/db/client";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const nothing = () => new Response("Not found", { status: 404, headers: { "cache-control": "no-store" } });

/**
 * A file from a candidate's submission, for the people who see the batch
 * (recruiters, reviewers, admins, company heads) of the same company. Only
 * files listed in the frozen submission; never a draft. Always downloaded,
 * never shown inside the site, and never cached. Anything else is a 404, so
 * the address can't be used to find out what exists.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string; batch: string; candidate: string; file: string }> }) {
  const { slug, batch, candidate, file } = await params;
  if (![batch, candidate, file].every((v) => UUID.test(v))) return nothing();
  const member = await getWorkspaceMember(slug);
  if (!allowCompany(member, slug) || !seesHiring(member)) return nothing();
  const sql = db();
  if (!sql) return new Response("Try again in a minute", { status: 503, headers: { "cache-control": "no-store" } });
  const found = await submittedFile(sql, { companyId: member.companyId, batchId: batch, candidateId: candidate, fileId: file });
  if (!found) return found === null ? new Response("Try again in a minute", { status: 503 }) : nothing();
  const stored = await getAttemptFile(found.storageKey);
  if (!stored) return new Response("This file can't be read right now", { status: 503, headers: { "cache-control": "no-store" } });
  const ascii = found.name.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_");
  return new Response(stored.bytes as BodyInit, {
    headers: {
      "content-type": stored.type,
      "content-disposition": `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(found.name)}`,
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
      "content-security-policy": "sandbox",
    },
  });
}
