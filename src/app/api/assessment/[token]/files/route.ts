import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { addAttemptFile, fileSlot, removeAttemptFile } from "@/lib/company/attempt-data";
import { ATTEMPT_FILE_LIMITS, attemptFileKey, safeFileName, sizeText, sniffAttemptFile, tooBigText } from "@/lib/company/attempt-files";
import { putAttemptFile } from "@/lib/company/attempt-storage";
import { readCandidateLink } from "@/lib/company/batch-link";
import { db } from "@/lib/db/client";

/**
 * A candidate attaching or removing a file on their running test. Their
 * private link (in the path) is the only key; every request checks it, and
 * the database decides whether the attempt is theirs, still open and has a
 * free slot. Files go to private storage first and are recorded after, so a
 * refused record can leave an unlisted file in storage, never a listed file
 * without its bytes.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const LIMIT = sizeText(ATTEMPT_FILE_LIMITS.bytes);
// The form around one file adds a little; anything much larger is refused before it is read.
const MAX_REQUEST = ATTEMPT_FILE_LIMITS.bytes + 64 * 1024;

const reply = (status: number, body: Record<string, unknown>) =>
  NextResponse.json(body, { status, headers: { "cache-control": "no-store" } });
const MESSAGES = {
  refused: "This link no longer opens the test. Reload the page.",
  closed: "Time is up, so files can't be added or removed.",
  submitted: "This test is submitted, so its files can't change. Reload to see your receipt.",
  full: `You've attached ${ATTEMPT_FILE_LIMITS.count} files, the most allowed. Remove one to add another.`,
  duplicate: "That file is already attached.",
  unavailable: "Files can't be saved right now. Try again in a minute; your written answer is unaffected.",
} as const;

export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const ref = readCandidateLink(token);
  if (!ref) return reply(403, { status: "refused", message: MESSAGES.refused });
  const declared = Number(req.headers.get("content-length") ?? "0");
  if (declared > MAX_REQUEST) return reply(413, { status: "too_big", message: `Files can be up to ${LIMIT}.` });

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return reply(400, { status: "bad", message: "That upload didn't arrive whole. Try again." });
  }
  const attemptId = form.get("attemptId");
  const file = form.get("file");
  if (typeof attemptId !== "string" || !UUID.test(attemptId) || !(file instanceof File)) return reply(400, { status: "bad", message: "Choose a file to attach." });
  if (file.size === 0) return reply(400, { status: "bad", message: "That file is empty." });
  if (file.size > ATTEMPT_FILE_LIMITS.bytes) return reply(413, { status: "too_big", message: tooBigText(file.size) });

  const bytes = new Uint8Array(await file.arrayBuffer());
  const name = safeFileName(file.name);
  const kind = sniffAttemptFile(bytes, name);
  if (!kind) return reply(415, { status: "type", message: "Attach a PDF, PNG, JPG, TXT or MD file." });

  const sql = db();
  if (!sql) return reply(503, { status: "unavailable", message: MESSAGES.unavailable });
  const who = { candidateId: ref.id, generation: ref.generation, attemptId };
  const slot = await fileSlot(sql, who);
  if (!slot) return reply(503, { status: "unavailable", message: MESSAGES.unavailable });
  if (slot.status !== "open") return reply(409, { status: slot.status, message: MESSAGES[slot.status] });
  if (slot.count >= ATTEMPT_FILE_LIMITS.count) return reply(409, { status: "full", message: MESSAGES.full });

  const sha256 = createHash("sha256").update(bytes).digest("hex");
  const storageKey = attemptFileKey(slot.companyId, attemptId, sha256, kind);
  if (!(await putAttemptFile(storageKey, bytes))) return reply(503, { status: "unavailable", message: MESSAGES.unavailable });

  const record = () => addAttemptFile(sql, { ...who, name, kind, bytes: bytes.length, sha256, storageKey });
  let out = await record();
  // Another upload may have taken the same slot a moment ago: try the next free one once.
  if (out?.status === "full") out = await record();
  if (!out) return reply(503, { status: "unavailable", message: MESSAGES.unavailable });
  if (out.status === "added") return reply(200, { status: "added", file: out.file });
  return reply(409, { status: out.status, message: MESSAGES[out.status] });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const ref = readCandidateLink(token);
  if (!ref) return reply(403, { status: "refused", message: MESSAGES.refused });
  let body: { attemptId?: unknown; fileId?: unknown };
  try {
    body = await req.json();
  } catch {
    return reply(400, { status: "bad", message: "Try again." });
  }
  if (typeof body.attemptId !== "string" || !UUID.test(body.attemptId) || typeof body.fileId !== "string" || !UUID.test(body.fileId)) {
    return reply(400, { status: "bad", message: "Try again." });
  }
  const sql = db();
  if (!sql) return reply(503, { status: "unavailable", message: MESSAGES.unavailable });
  const gone = await removeAttemptFile(sql, { candidateId: ref.id, generation: ref.generation, attemptId: body.attemptId, fileId: body.fileId });
  if (gone === null) return reply(503, { status: "unavailable", message: MESSAGES.unavailable });
  if (!gone) return reply(409, { status: "closed", message: "That file can't be removed now. Reload the page." });
  return reply(200, { status: "removed" });
}
