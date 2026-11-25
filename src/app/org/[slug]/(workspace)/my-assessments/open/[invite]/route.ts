import { allowCompany } from "@/lib/company/access";
import { getWorkspaceMember } from "@/lib/company/auth";
import { signCandidateToken } from "@/lib/company/batch-link";
import { myInvitation } from "@/lib/company/my-assessments";
import { db } from "@/lib/db/client";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const nothing = () => new Response("Not found", { status: 404, headers: { "cache-control": "no-store" } });

/**
 * Opens one of my own tests (U11, D1 = A): checks the invitation is the
 * signed-in member's — this company, their work email, a sent round — then
 * sends them to its current private link, built here at the moment they ask.
 * From there it is the ordinary candidate flow. Anyone else's invitation is
 * a 404, so the address can't be used to find what exists.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string; invite: string }> }) {
  const { slug, invite } = await params;
  if (!UUID.test(invite)) return nothing();
  const member = await getWorkspaceMember(slug);
  if (!allowCompany(member, slug)) return nothing();
  const sql = db();
  const secret = process.env.AUTH_SECRET;
  if (!sql || !secret) return new Response("Try again in a minute", { status: 503, headers: { "cache-control": "no-store" } });
  const mine = await myInvitation(sql, member.companyId, member.email, invite);
  if (mine === null) return new Response("Try again in a minute", { status: 503, headers: { "cache-control": "no-store" } });
  if (!mine) return nothing();
  return new Response(null, {
    status: 303,
    headers: { location: `/assessment/${signCandidateToken(secret, mine.id, mine.generation)}`, "cache-control": "no-store", "referrer-policy": "no-referrer" },
  });
}
