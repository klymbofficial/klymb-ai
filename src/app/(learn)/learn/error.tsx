"use client";

import Link from "next/link";
import { useEffect } from "react";
import { learnerButton } from "@/components/learner/learner-ui";

/**
 * The learner area failed to load: the course data could not be read, or
 * something broke while building the page. It says so and offers a retry.
 * It is not the "not enrolled" page, because the learner's place is fine.
 */
export default function LearnError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("learner page failed:", error.digest ?? error.message);
  }, [error]);

  return (
    <div role="alert" className="mx-auto max-w-lg px-4 py-24 text-center">
      <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-red-deep">Something went wrong</p>
      <h1 className="display mt-3 text-3xl text-balance">We couldn&apos;t load your course</h1>
      <p className="mt-3 text-muted">
        This is on our side, not yours. Your submissions are not affected. Try again in a moment.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <button type="button" onClick={reset} className={learnerButton("primary")}>Try again</button>
        <Link href="/" className={learnerButton("secondary")}>Go to klymb.ai</Link>
      </div>
    </div>
  );
}
