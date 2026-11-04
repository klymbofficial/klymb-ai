import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth, verifiedEmailFrom } from "@/auth";
import { LearnerTopBar } from "@/components/learner/LearnerTopBar";
import { ProfileForm } from "@/components/learner/ProfileForm";
import { ProfileScoreCard } from "@/components/learner/ProfileScoreCard";
import { readProfile } from "@/lib/profile";
import { scoreProfile } from "@/lib/profile-score";

export const metadata: Metadata = { title: "Your profile", robots: { index: false, follow: false } };

/** The learner's own profile: how complete it is, what to add, and the form to add it. */
export default async function ProfilePage() {
  const session = await auth();
  const email = verifiedEmailFrom(session);
  if (!email) redirect("/learn/login");
  const { profile, saved } = await readProfile(email, session?.user?.name);
  const score = scoreProfile(profile, { hasPhoto: !!session?.user?.image });

  return (
    <>
      <LearnerTopBar name={profile.name || session?.user?.name || email.split("@")[0]} image={session?.user?.image} />
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-8 sm:py-14 lg:grid-cols-[1fr_20rem] lg:items-start">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-red-deep">Your profile</p>
          <h1 className="display mt-3 text-[clamp(1.9rem,4vw,2.75rem)]">Show what you can do</h1>
          <p className="mt-3 max-w-2xl text-muted">
            {saved ? "Keep it current as you finish courses and build things." : "We've filled in what we already know. Check it, add the rest, and save."}
          </p>
          <div className="mt-8"><ProfileForm profile={profile} /></div>
        </div>
        <div className="lg:sticky lg:top-6"><ProfileScoreCard score={score} /></div>
      </div>
    </>
  );
}
