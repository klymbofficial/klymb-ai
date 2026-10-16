import { NextResponse } from "next/server";
import { getLearnerState } from "@/lib/learner/data";

export const dynamic = "force-dynamic";

/** Does this session still hold the learner's one device? Polled by DeviceWatch. */
export async function GET() {
  const s = await getLearnerState();
  return NextResponse.json({ state: s.state }, { headers: { "Cache-Control": "no-store" } });
}
