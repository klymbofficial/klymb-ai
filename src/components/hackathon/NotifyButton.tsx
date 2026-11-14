"use client";

import { useState, useTransition } from "react";
import { notifyMeAboutHackathon } from "@/app/(learn)/learn/hackathon/actions";
import { Button } from "@/components/ui/Button";

/** "Tell me when it opens", for a signed-in visitor. */
export function NotifyButton({ already }: { already: boolean }) {
  const [done, setDone] = useState(already);
  const [failed, setFailed] = useState(false);
  const [pending, start] = useTransition();
  if (done) return <p role="status" className="text-sm font-bold">You&apos;re on the list: we&apos;ll email you when registration opens.</p>;
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button
        type="button"
        soft
        disabled={pending}
        aria-busy={pending}
        onClick={() => start(async () => {
          const r = await notifyMeAboutHackathon();
          setDone(r.ok);
          setFailed(!r.ok);
        })}
      >
        {pending ? "Saving…" : "Tell me when it opens"}
      </Button>
      {failed && <p role="alert" className="text-sm font-semibold text-error">That didn&apos;t work. Please try again.</p>}
    </div>
  );
}
