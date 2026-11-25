import { NextResponse } from "next/server";
import { readCandidateLink } from "@/lib/company/batch-link";
import { CLIENT_EVENTS, recordAttemptEvent, type EventKind } from "@/lib/company/proctor-data";
import { db } from "@/lib/db/client";

/**
 * A candidate's test window reporting a proctoring event (0070). The private
 * link in the path is the only key; the database checks it, records the
 * event, counts warnings and, at the company's limit, submits the test.
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const reply = (status: number, body: Record<string, unknown>) => NextResponse.json(body, { status, headers: { "cache-control": "no-store" } });

export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const ref = readCandidateLink(token);
  if (!ref) return reply(403, { status: "refused" });
  let body: { attemptId?: unknown; kind?: unknown };
  try {
    body = await req.json();
  } catch {
    return reply(400, { status: "bad" });
  }
  if (typeof body.attemptId !== "string" || !UUID.test(body.attemptId) || !CLIENT_EVENTS.includes(body.kind as EventKind)) return reply(400, { status: "bad" });
  const sql = db();
  if (!sql) return reply(503, { status: "unavailable" });
  const out = await recordAttemptEvent(sql, { attemptId: body.attemptId, candidateId: ref.id, generation: ref.generation, kind: body.kind as EventKind });
  if (!out) return reply(503, { status: "unavailable" });
  return reply(out.status === "refused" ? 403 : 200, out);
}
