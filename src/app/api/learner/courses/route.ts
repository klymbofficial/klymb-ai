import { NextResponse } from "next/server";
import { currentEmail } from "@/auth";
import { loadDashboard, myLibraryCourses } from "@/lib/learner/dashboard";
import { getLearnerTracks } from "@/lib/learner/data";

export const dynamic = "force-dynamic";

/**
 * The signed-in learner's courses, for the Course Library: which cards are
 * already theirs, and the next step in each. Asked for by the library in the
 * browser, so the library page itself stays static for everyone. Empty for visitors.
 */
export async function GET() {
  const email = await currentEmail();
  if (!email) return NextResponse.json({ courses: {} }, { headers: { "Cache-Control": "private, no-store" } });
  try {
    const { courses } = await loadDashboard(email, await getLearnerTracks());
    return NextResponse.json({ courses: myLibraryCourses(courses) }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    // The library works without it: every card simply offers to enrol.
    return NextResponse.json({ courses: {} }, { status: 503, headers: { "Cache-Control": "private, no-store" } });
  }
}
