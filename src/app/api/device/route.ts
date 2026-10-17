import { NextResponse } from "next/server";
import { getLearnerState } from "@/lib/learner/data";
import { deviceChannel } from "@/lib/learner/device-channel";

export const dynamic = "force-dynamic";

/** Does this session still hold the learner's one device? Plus the live channel to listen on. */
export async function GET() {
  const s = await getLearnerState();
  return NextResponse.json(
    { state: s.state, ...(s.state === "enrolled" ? { channel: deviceChannel(s.learner.id) } : {}) },
    { headers: { "Cache-Control": "no-store" } },
  );
}
