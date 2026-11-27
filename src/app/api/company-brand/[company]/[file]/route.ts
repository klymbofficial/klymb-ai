import { isAdmin } from "@/lib/company/access";
import { getMemberships } from "@/lib/company/auth";
import { getBrandFile } from "@/lib/company/brand-storage";
import { logoKey } from "@/lib/company/branding";
import { logoVisibility } from "@/lib/company/branding-data";
import { db } from "@/lib/db/client";

export const dynamic = "force-dynamic";

const NOT_FOUND = () => new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });

/**
 * A company's logo, served from Klymb's own address so emails and the
 * sign-in page never point at the storage host.
 *
 *   * In the company's published branding: anyone, cached for good (the file
 *     name is its hash, so the same name always means the same bytes).
 *   * Only in its draft: the company's own admins, for the preview, never cached.
 *   * Anything else, or a malformed name: 404.
 *
 * Served as an image only: the type comes from the checked extension, never
 * the upload, and the response can't be run as a page.
 */
export async function GET(_req: Request, { params }: RouteContext<"/api/company-brand/[company]/[file]">) {
  const { company, file } = await params;
  const key = logoKey(company, file);
  const sql = db();
  if (!key || !sql) return NOT_FOUND();

  const visibility = await logoVisibility(sql, company, key);
  if (!visibility) return NOT_FOUND();
  if (visibility === "draft") {
    const memberships = await getMemberships();
    if (!memberships.some((m) => m.companyId === company && isAdmin(m))) return NOT_FOUND();
  }

  const stored = await getBrandFile(key);
  if (!stored) return NOT_FOUND();
  return new Response(stored.bytes as BodyInit, {
    headers: {
      "Content-Type": stored.type,
      "Content-Length": String(stored.bytes.byteLength),
      "Cache-Control": visibility === "published" ? "public, max-age=31536000, immutable" : "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
      "Content-Disposition": "inline",
    },
  });
}
