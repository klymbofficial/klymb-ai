"use client";

import { Button } from "@/components/ui/Button";

/** Something broke while building a company page. Retry re-reads it; nothing here is company data. */
export default function OrgError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <div role="alert" className="card max-w-xl p-6">
      <h1 className="display text-xl">This page didn&apos;t load</h1>
      <p className="mt-2 text-sm text-muted">
        Something went wrong on our side, not with your access. Try again; if it keeps happening, write to team@klymb.ai.
      </p>
      <Button type="button" onClick={() => retry()} className="mt-5">Try again</Button>
    </div>
  );
}
