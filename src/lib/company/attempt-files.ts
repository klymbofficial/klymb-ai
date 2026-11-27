/**
 * Files a candidate attaches to a written_file test (H07b; decision of
 * 24 Nov 2026: up to 3 files, 4 MB each, PDF / PNG / JPG / TXT / MD). Free of
 * the database and of Next so it can be tested. A file's type comes from its
 * own bytes: PDFs and images by their signature, text by being valid UTF-8
 * with no control characters, and the name only decides between .txt and .md.
 */

export const ATTEMPT_FILE_LIMITS = {
  count: 3,
  /** 4 MB: under Vercel's 4.5 MB request limit with room for the form around it. */
  bytes: 4 * 1024 * 1024,
  name: 200,
} as const;

export type AttemptFileKind = "pdf" | "png" | "jpg" | "txt" | "md";

export const ATTEMPT_FILE_TYPES: Record<AttemptFileKind, string> = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  txt: "text/plain; charset=utf-8",
  md: "text/markdown; charset=utf-8",
};

/** What the file picker offers. The server decides again from the bytes. */
export const ATTEMPT_FILE_ACCEPT = ".pdf,.png,.jpg,.jpeg,.txt,.md";

const starts = (b: Uint8Array, ...sig: number[]) => b.length >= sig.length && sig.every((v, i) => b[i] === v);

/** True for text a reviewer can safely open: valid UTF-8, no NULs or other control characters except tab and line breaks. */
function isPlainText(b: Uint8Array): boolean {
  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(b);
  } catch {
    return false;
  }
  return !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(text);
}

/** The file's kind, or null when it isn't one of the accepted kinds. SVG, HTML, archives and office files never are. */
export function sniffAttemptFile(bytes: Uint8Array, name: string): AttemptFileKind | null {
  if (!bytes.length) return null;
  if (starts(bytes, 0x25, 0x50, 0x44, 0x46, 0x2d)) return "pdf"; // %PDF-
  if (starts(bytes, 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return "png";
  if (starts(bytes, 0xff, 0xd8, 0xff)) return "jpg";
  const ext = name.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1];
  if ((ext === "txt" || ext === "md") && isPlainText(bytes)) return ext;
  return null;
}

/** A name safe to show and store: no folders, no control characters, trimmed, at most 200 characters. */
export function safeFileName(name: unknown): string {
  const base = typeof name === "string" ? name.split(/[\\/]/).pop() ?? "" : "";
  const clean = base.replace(/[\u0000-\u001f\u007f]/g, "").replace(/\s+/g, " ").trim();
  return (clean || "file").slice(0, ATTEMPT_FILE_LIMITS.name);
}

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const KEY = new RegExp(`^attempt-files/(${UUID})/(${UUID})/([0-9a-f]{64})\\.(pdf|png|jpg|txt|md)$`);

/** Where a file is kept: by company, attempt and its own hash, so a key always means the same bytes. */
export function attemptFileKey(companyId: string, attemptId: string, sha256: string, kind: AttemptFileKind): string {
  const key = `attempt-files/${companyId}/${attemptId}/${sha256}.${kind}`;
  if (!KEY.test(key)) throw new Error("not an attempt file key");
  return key;
}

/** The parts of a well-formed key, or null. Only such keys are ever read or written. */
export function parseAttemptFileKey(key: string): { companyId: string; attemptId: string; sha256: string; kind: AttemptFileKind } | null {
  const m = KEY.exec(key);
  return m ? { companyId: m[1], attemptId: m[2], sha256: m[3], kind: m[4] as AttemptFileKind } : null;
}

/** "312 KB", "3.4 MB", "4 MB". */
export function sizeText(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(/\.0$/, "")} MB`;
}

/** Why a file is too big, without "up to 4 MB, this one is 4 MB" when it is only just over. */
export function tooBigText(bytes: number): string {
  const limit = sizeText(ATTEMPT_FILE_LIMITS.bytes);
  const size = sizeText(bytes);
  return size === limit ? `Files can be up to ${limit}, and this one is just over.` : `Files can be up to ${limit}. This one is ${size}.`;
}
