import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { attemptFileKey } from "@/lib/company/attempt-files";
import { putAttemptFile } from "@/lib/company/attempt-storage";
import { readCandidateLink } from "@/lib/company/batch-link";
import { SNAPSHOT_BYTES, addSnapshot } from "@/lib/company/proctor-data";
import { db } from "@/lib/db/client";

/**
 * A webcam snapshot from a candidate who agreed to them (0070). JPEG only,
 * small; stored in the private attempt-file storage under the attempt, then
 * recorded only if the link, the open attempt and the company's setting all
 * allow it. Never served publicly: reviewers read it through their company.
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const reply = (status: number, body: Record<string, unknown>) => NextResponse.json(body, { status, headers: { "cache-control": "no-store" } });

export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const ref = readCandidateLink(token);
  if (!ref) return reply(403, { status: "refused" });
  const attemptId = new URL(req.url).searchParams.get("attempt") ?? "";
  if (!UUID.test(attemptId)) return reply(400, { status: "bad" });
  if (Number(req.headers.get("content-length") ?? "0") > SNAPSHOT_BYTES) return reply(413, { status: "too_big" });
  const bytes = new Uint8Array(await req.arrayBuffer());
  if (bytes.length < 100 || bytes.length > SNAPSHOT_BYTES || bytes[0] !== 0xff || bytes[1] !== 0xd8) return reply(415, { status: "type" });
  const sql = db();
  if (!sql) return reply(503, { status: "unavailable" });
  // The attempt's company comes from the database, never the request.
  const owner = await sql.row<{ company_id: string }>`select company_id from course.candidate_attempts where id = ${attemptId}::uuid and candidate_id = ${ref.id}::uuid`;
  if (owner.error) return reply(503, { status: "unavailable" });
  if (!owner.data) return reply(403, { status: "refused" });
  const key = attemptFileKey(owner.data.company_id, attemptId, createHash("sha256").update(bytes).digest("hex"), "jpg");
  if (!(await putAttemptFile(key, bytes))) return reply(503, { status: "unavailable" });
  const ok = await addSnapshot(sql, { attemptId, candidateId: ref.id, generation: ref.generation, key, bytes: bytes.length });
  if (ok === null) return reply(503, { status: "unavailable" });
  return reply(ok ? 200 : 409, { status: ok ? "saved" : "refused" });
}
