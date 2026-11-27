import { allowCompany } from "@/lib/company/access";
import { getWorkspaceMember } from "@/lib/company/auth";
import { getAttemptFile } from "@/lib/company/attempt-storage";
import { seesHiring } from "@/lib/company/batch-rules";
import { snapshotFor } from "@/lib/company/proctor-data";
import { roundOfCandidate } from "@/lib/company/round-data";
import { db } from "@/lib/db/client";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const nothing = () => new Response("Not found", { status: 404, headers: { "cache-control": "no-store" } });
const later = () => new Response("Try again in a minute", { status: 503, headers: { "cache-control": "no-store" } });

/** A webcam snapshot (0070), shown inline to the people who see this company's hiring; anything else is a 404. Never cached. */
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string; item: string; candidate: string; snapshot: string }> }) {
  const { slug, item, candidate, snapshot } = await params;
  if (![candidate, snapshot].every((v) => UUID.test(v))) return nothing();
  const member = await getWorkspaceMember(slug);
  if (!allowCompany(member, slug) || !seesHiring(member)) return nothing();
  const sql = db();
  if (!sql) return later();
  const batch = await roundOfCandidate(sql, member.companyId, item, candidate);
  if (batch === null) return later();
  if (!batch) return nothing();
  const key = await snapshotFor(sql, { companyId: member.companyId, batchId: batch, candidateId: candidate, id: snapshot });
  if (key === null) return later();
  if (!key) return nothing();
  const stored = await getAttemptFile(key);
  if (!stored) return later();
  return new Response(stored.bytes as BodyInit, { headers: { "content-type": "image/jpeg", "cache-control": "private, no-store", "x-content-type-options": "nosniff" } });
}
