import { signedLink } from "@/lib/r2";

export const dynamic = "force-dynamic";

/** Only the course's own video files, by name: nothing else in the bucket. */
const FILE = /^[a-z0-9-]+\.mp4$/;

/**
 * Plays a System Design video: redirects to a fresh signed R2 link. Without R2
 * keys (local dev, or before they're set) it falls back to the copy in public/.
 */
export async function GET(_req: Request, { params }: RouteContext<"/api/video/[file]">) {
  const { file } = await params;
  if (!FILE.test(file)) return new Response("Not found", { status: 404 });
  const url = (await signedLink(`system-design/${file}`)) ?? `/videos/system-design/${file}`;
  return new Response(null, { status: 302, headers: { Location: url, "Cache-Control": "private, no-store" } });
}
