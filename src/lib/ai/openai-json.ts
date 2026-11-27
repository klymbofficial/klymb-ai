import "server-only";

/**
 * One structured answer from OpenAI's Responses API (user, 26 Nov: OpenAI
 * for reading job descriptions and suggesting written-answer scores). The
 * reply is held to a JSON schema, so it parses; the caller still checks it
 * with its own rules, because a schema says what shape, not what's true.
 *
 * OPENAI_API_KEY stays on the server. `store: false` asks OpenAI not to keep
 * the exchange. The model can change without a deploy (OPENAI_ASSESS_MODEL),
 * as the coach's can.
 */

const URL = "https://api.openai.com/v1/responses";
export const ASSESS_MODEL = process.env.OPENAI_ASSESS_MODEL?.trim() || "gpt-5.5";

export const aiConfigured = () => !!process.env.OPENAI_API_KEY?.trim();

export interface JsonFile { name: string; mime: string; bytes: Uint8Array }

export type JsonResult<T> = { ok: true; value: T; model: string } | { ok: false; error: "not-configured" | "upstream" | "timeout" | "refused" | "unreadable" };

export async function respondJson<T>(p: {
  instructions: string;
  text: string;
  file?: JsonFile;
  schemaName: string;
  schema: Record<string, unknown>;
  /** A stable hash for OpenAI's abuse tooling, never an email. */
  identity?: string;
  timeoutMs?: number;
}): Promise<JsonResult<T>> {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) return { ok: false, error: "not-configured" };
  const content: Record<string, unknown>[] = [{ type: "input_text", text: p.text }];
  if (p.file) {
    content.push({ type: "input_file", filename: p.file.name, file_data: `data:${p.file.mime};base64,${Buffer.from(p.file.bytes).toString("base64")}` });
  }
  let res: Response;
  try {
    res = await fetch(URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: ASSESS_MODEL,
        instructions: p.instructions,
        input: [{ role: "user", content }],
        text: { format: { type: "json_schema", name: p.schemaName, schema: p.schema, strict: true } },
        store: false,
        ...(p.identity ? { safety_identifier: p.identity } : {}),
      }),
      signal: AbortSignal.timeout(p.timeoutMs ?? 60_000),
    });
  } catch (e) {
    return { ok: false, error: e instanceof Error && e.name === "TimeoutError" ? "timeout" : "upstream" };
  }
  const body = (await res.json().catch(() => null)) as { output?: { type: string; content?: { type: string; text?: string; refusal?: string }[] }[]; error?: { message?: string } } | null;
  if (!res.ok || !body) {
    console.error("openai responses failed:", res.status, body?.error?.message?.slice(0, 200));
    return { ok: false, error: res.status === 400 ? "unreadable" : "upstream" };
  }
  const parts = (body.output ?? []).filter((o) => o.type === "message").flatMap((o) => o.content ?? []);
  if (parts.some((c) => c.type === "refusal")) return { ok: false, error: "refused" };
  const text = parts.filter((c) => c.type === "output_text").map((c) => c.text ?? "").join("");
  try {
    return { ok: true, value: JSON.parse(text) as T, model: ASSESS_MODEL };
  } catch {
    return { ok: false, error: "upstream" };
  }
}
