"use client";

import { useActionState } from "react";
import { saveEvidenceProfile } from "@/app/(learn)/learn/actions";
import { Button } from "@/components/ui/Button";

/** Declared once, then every submitted link is checked against these. */
export function EvidenceProfile({
  githubUsername, linkedinSlug,
}: { githubUsername: string | null; linkedinSlug: string | null }) {
  const [state, action, pending] = useActionState(saveEvidenceProfile, null as { error?: string; saved?: boolean } | null);
  const complete = !!githubUsername && !!linkedinSlug;

  return (
    <form action={action} className="border-2 border-line bg-paper p-6">
      <h2 className="display text-2xl">Your evidence accounts</h2>
      <p className="mt-2 text-sm text-muted">
        {complete
          ? "Every link you submit is checked against these, so nothing in your portfolio can belong to someone else."
          : "Add these before your first submission. Every link you submit is checked against them."}
      </p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="github" className="block text-sm font-bold">GitHub username</label>
          <input
            id="github" name="github" defaultValue={githubUsername ?? ""} spellCheck={false} autoComplete="off"
            placeholder="your-username"
            className="mt-2 block w-full border-2 border-line bg-white px-3 py-2.5 focus:border-ink focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="linkedin" className="block text-sm font-bold">LinkedIn profile</label>
          <input
            id="linkedin" name="linkedin" defaultValue={linkedinSlug ?? ""} spellCheck={false} autoComplete="off"
            placeholder="linkedin.com/in/yourname"
            className="mt-2 block w-full border-2 border-line bg-white px-3 py-2.5 focus:border-ink focus:outline-none"
          />
        </div>
      </div>

      {state?.error && <p role="alert" className="mt-4 border-2 border-red-deep bg-red-tint p-3 text-sm font-semibold text-red-deep">{state.error}</p>}

      <div className="mt-5 flex flex-wrap items-center gap-4">
        <Button type="submit" variant={complete ? "secondary" : "primary"} disabled={pending} aria-busy={pending}>
          {pending ? "Saving…" : complete ? "Update" : "Save accounts"}
        </Button>
        <p role="status" aria-live="polite" className="text-sm font-semibold text-muted">
          {state?.saved ? "Saved." : complete ? `Checking against ${githubUsername} and ${linkedinSlug}` : "Required before you submit Day 1"}
        </p>
      </div>
    </form>
  );
}
