import "server-only";
import { headers } from "next/headers";
import { auth, verifiedEmailFrom } from "@/auth";
import { hackathonPhase } from "@/data/hackathon";
import { hasInterest, myTeam, publishedResults } from "@/lib/hackathon";
import { readProfile } from "@/lib/profile";
import { inAppBrowser } from "@/lib/sd-offer";

/**
 * Everything the hackathon page needs for one visitor, signed in or not:
 * the event's phase and winners, and for a signed-in person their team,
 * whether they asked to be notified, and the form's prefill. Shared by the
 * public /hackathons and the learner app's /learn/hackathon.
 */
export async function loadHackathonPage(signin?: string) {
  const session = await auth();
  const email = verifiedEmailFrom(session);
  const results = await publishedResults();
  const phase = hackathonPhase(results.length > 0);
  const [team, interested, profile] = email
    ? await Promise.all([myTeam(email), hasInterest(email), readProfile(email, session?.user?.name).then((r) => r.profile)])
    : [null, false, null];
  const name = profile?.name || session?.user?.name || (email ? email.split("@")[0] : "");
  return {
    session,
    email,
    name,
    landing: { phase, results, team },
    mine: {
      phase,
      results,
      team,
      email,
      interested,
      defaults: {
        name,
        phone: profile?.phone ?? "",
        college: profile?.institution ?? "",
        graduationYear: profile?.graduationYear ? String(profile.graduationYear) : "",
      },
      inAppBrowser: inAppBrowser((await headers()).get("user-agent") ?? ""),
      signInFailed: signin === "failed",
    },
  };
}
