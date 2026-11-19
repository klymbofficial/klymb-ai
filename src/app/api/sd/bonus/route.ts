import { readFile } from "node:fs/promises";
import path from "node:path";
import { currentEmail } from "@/auth";
import { hasCourseAccess, lessonPasses } from "@/lib/access";
import { SD_BONUS } from "@/lib/sd-bonus";
import { SD_COURSE } from "@/lib/sd-offer";

export const dynamic = "force-dynamic";

/**
 * Downloads the Top 50 interview questions PDF: signed in, enrolled, and the
 * Day 21 lesson passed on the server. next.config.ts traces the file into this
 * route, since it sits outside public/ on purpose.
 */
export async function GET() {
  const email = await currentEmail();
  if (!email || !(await hasCourseAccess(email, SD_COURSE))) return new Response("The bonus is in the full course.", { status: 403 });
  const passes = await lessonPasses(email, SD_COURSE);
  if (!(SD_BONUS.unlockLesson in passes)) return new Response(`The bonus unlocks once you pass ${SD_BONUS.unlockLabel}.`, { status: 403 });

  const pdf = await readFile(path.join(process.cwd(), "src/data/system-design/bonus", SD_BONUS.file));
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="Klymb-${SD_BONUS.file}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
