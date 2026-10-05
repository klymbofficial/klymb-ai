import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { cohort } from "@/data/config";
import { priceFrom } from "@/data/tracks";
import { formatDate, formatINR } from "@/lib/format";

/**
 * The card shown when a Klymb link is shared on WhatsApp, LinkedIn or X.
 * Rendered once at build time; the date and price come from config, so the
 * card cannot drift from the site.
 */
export const alt = "Klymb.ai | Become Job-Ready in 30 Days";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const INK = "#201e1d";
const RED = "#83050b";
const PAPER = "#f3f2f2";
const MUTED = "#5a5757";

export default async function Image() {
  const [black, medium] = await Promise.all([
    readFile(join(process.cwd(), "src/assets/fonts/Archivo-900.ttf")),
    readFile(join(process.cwd(), "src/assets/fonts/Archivo-500.ttf")),
  ]);

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: PAPER, fontFamily: "Archivo" }}>
        <div style={{ display: "flex", flex: 1, flexDirection: "column", justifyContent: "space-between", margin: 48, padding: "56px 64px", background: "#fff", borderRadius: 36 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", fontSize: 34, fontWeight: 900, color: INK, letterSpacing: -1 }}>
              <span>KLYMB</span><span style={{ color: RED, marginLeft: -4 }}>.AI</span>
            </div>
            <div style={{ display: "flex", fontSize: 20, fontWeight: 500, color: RED, letterSpacing: 3 }}>30-DAY JOB READINESS PROGRAM</div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", fontSize: 92, fontWeight: 900, lineHeight: 0.98, letterSpacing: -4, color: INK }}>
            <span>Become</span>
            <span style={{ color: RED }}>Job-Ready</span>
            <span>in 30 Days</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 28, fontSize: 24, fontWeight: 500, color: MUTED }}>
            <span>Next cohort {formatDate(cohort.startDate)}</span>
            <span style={{ width: 6, height: 6, borderRadius: 3, background: MUTED }} />
            <span>From {formatINR(priceFrom)}</span>
            <span style={{ width: 6, height: 6, borderRadius: 3, background: MUTED }} />
            <span>learn.klymb.ai</span>
          </div>
        </div>
        <div style={{ height: 14, background: RED }} />
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Archivo", data: black, weight: 900, style: "normal" },
        { name: "Archivo", data: medium, weight: 500, style: "normal" },
      ],
    },
  );
}
