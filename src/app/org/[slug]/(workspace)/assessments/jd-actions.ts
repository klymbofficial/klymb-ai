"use server";

import { createHash } from "node:crypto";
import { aiConfigured, respondJson } from "@/lib/ai/openai-json";
import { allowCompany } from "@/lib/company/access";
import { canWriteTests } from "@/lib/company/assessment-rules";
import { logCompany } from "@/lib/company/audit";
import { getWorkspaceMember } from "@/lib/company/auth";
import { JD_FILE_TYPES, JD_LIMITS, jdFileKind, jdInstructions, jdSchema, readJdReply, type JdProposal } from "@/lib/company/jd-rules";
import { klymbLibrary, ownLibrary } from "@/lib/company/library-data";
import { activeRoles } from "@/lib/company/roles-data";
import { db } from "@/lib/db/client";
import { checkRateLimit } from "@/lib/rate-limit";

/**
 * Reads a job description and proposes what its assessment should cover
 * (user, 26 Nov): skills from the Library's own tags (only multiple-choice
 * questions that are published, so each has reviewed questions behind it),
 * the closest job role, the experience level and a name. Nothing is created
 * here; the recruiter confirms or changes the proposal, then the automatic
 * builder makes a draft. The description goes to OpenAI and is not kept
 * there (store: false) or here; the audit records only that it happened.
 */

export type JdResult = { ok: true; proposal: JdProposal } | { ok: false; message: string };

const UNAVAILABLE = { ok: false as const, message: "Reading that didn't work just now. Try again in a minute, or choose skills yourself." };

export async function readJobDescription(form: FormData): Promise<JdResult> {
  const slug = form.get("slug");
  const member = typeof slug === "string" ? await getWorkspaceMember(slug) : null;
  if (!allowCompany(member, slug as string) || !canWriteTests(member)) return { ok: false, message: "Only an admin or a recruiter in your company can create tests." };
  if (!aiConfigured()) return { ok: false, message: "Reading job descriptions isn't set up yet. Choose skills yourself for now." };

  const pasted = String(form.get("text") ?? "").trim();
  const upload = form.get("file");
  const file = upload instanceof File && upload.size > 0 ? upload : null;
  if (pasted.length > JD_LIMITS.text) return { ok: false, message: `Paste at most ${JD_LIMITS.text.toLocaleString("en-IN")} characters.` };
  if (!file && pasted.length < JD_LIMITS.minText) return { ok: false, message: "Paste the job description (a few sentences at least), or upload its file." };
  let attachment: { name: string; mime: string; bytes: Uint8Array } | undefined;
  let text = pasted;
  if (file) {
    if (file.size > JD_LIMITS.fileBytes) return { ok: false, message: "That file is over 900 KB. Paste the text instead, or upload a smaller file." };
    const kind = jdFileKind(file.name, file.type);
    if (!kind) return { ok: false, message: "Upload a PDF, Word (.docx) or .txt file." };
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (kind === "txt") text = [pasted, new TextDecoder().decode(bytes).slice(0, JD_LIMITS.text)].filter(Boolean).join("\n\n");
    else attachment = { name: file.name.slice(0, 120), mime: JD_FILE_TYPES[kind], bytes };
  }

  const limit = await checkRateLimit("jd_read", { limit: 20, windowMinutes: 60, identity: member!.email });
  if (!limit.allowed) return { ok: false, message: "That's a lot of job descriptions in an hour. Try again a little later." };

  const sql = db();
  if (!sql) return UNAVAILABLE;
  const [roles, klymb, mine] = await Promise.all([activeRoles(sql), klymbLibrary(sql), ownLibrary(sql, member!.companyId)]);
  if (!roles || !klymb || !mine) return UNAVAILABLE;
  const tags = [...new Set([...klymb, ...mine].filter((q) => q.type === "mcq" && q.status === "published").flatMap((q) => q.tags))].sort((a, b) => a.localeCompare(b));
  if (!tags.length) return { ok: false, message: "The Library has no published questions yet." };

  const reply = await respondJson<unknown>({
    instructions: jdInstructions(roles),
    text: `Job description${attachment ? " (attached file" + (text ? ", plus pasted notes below" : "") + ")" : ""}:\n<<<\n${text || "(see the attached file)"}\n>>>`,
    file: attachment,
    schemaName: "assessment_plan",
    schema: jdSchema(tags, roles),
    identity: createHash("sha256").update(`company:${member!.companyId}`).digest("hex").slice(0, 32),
  });
  if (!reply.ok) {
    if (reply.error === "unreadable") return { ok: false, message: "That file couldn't be read. Paste the text instead." };
    if (reply.error === "timeout") return { ok: false, message: "Reading took too long. Try again, or paste a shorter description." };
    return UNAVAILABLE;
  }
  const read = readJdReply(reply.value, tags, roles);
  await logCompany(member!, "company.jd_read", { file: attachment ? attachment.mime : file ? "text/plain" : null, chars: text.length, skills: read.ok ? read.value.skills.length : 0, model: reply.model });
  return read.ok ? { ok: true, proposal: read.value } : read;
}
