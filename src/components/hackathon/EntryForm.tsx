"use client";

import { useActionState } from "react";
import { submitHackathonEntry, type FormResult } from "@/app/(learn)/learn/hackathon/actions";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/FormField";

interface Entry { briefId: string; repoUrl: string; liveUrl: string; aiLogUrl: string; notes: string }

/** The team's submission; any member can save it, and change it until the deadline. */
export function EntryForm({ briefs, entry, deadlineLabel }: { briefs: { id: string; title: string }[]; entry: Entry | null; deadlineLabel: string }) {
  const [state, action, pending] = useActionState<FormResult, FormData>(submitHackathonEntry, null);
  const v = state?.values;
  const e = state?.errors ?? {};
  const val = (k: keyof Entry) => v?.[k] ?? entry?.[k] ?? "";
  return (
    <form key={v ? JSON.stringify(v) : entry?.repoUrl ?? "new"} action={action} className="flex flex-col gap-5" noValidate>
      <fieldset>
        <legend className="text-[13px] font-bold">Problem you built for</legend>
        <div className="mt-2 flex flex-col gap-2">
          {briefs.map((b) => (
            <label key={b.id} className="inline-flex items-center gap-2 text-sm">
              <input type="radio" name="briefId" value={b.id} defaultChecked={val("briefId") === b.id} /> {b.title}
            </label>
          ))}
        </div>
        {e.briefId && <p className="mt-1.5 text-xs font-medium text-error">{e.briefId}</p>}
      </fieldset>
      <TextField id="repoUrl" label="Public GitHub repository" type="url" defaultValue={val("repoUrl")} placeholder="https://github.com/you/project" error={e.repoUrl} />
      <TextField id="liveUrl" label="Live deployed URL" type="url" defaultValue={val("liveUrl")} placeholder="https://" error={e.liveUrl} />
      <TextField id="aiLogUrl" label="AI-usage log (PROMPTS.md or chat export)" type="url" defaultValue={val("aiLogUrl")} placeholder="https://github.com/you/project/blob/main/PROMPTS.md" error={e.aiLogUrl} />
      <div>
        <label htmlFor="notes" className="block text-[13px] font-bold">Notes <span className="font-normal text-muted">(optional: anything pre-built must be disclosed here)</span></label>
        <textarea id="notes" name="notes" rows={4} defaultValue={val("notes")} maxLength={2000} className="mt-1.5 block w-full rounded-lg border border-line/50 bg-surface/45 px-3.5 py-2 text-sm" />
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" soft disabled={pending} aria-busy={pending}>{pending ? "Saving…" : entry ? "Update entry" : "Submit entry"}</Button>
        {state?.ok && !pending && <p role="status" className="text-sm font-bold text-red-deep">Saved. You can change it until {deadlineLabel || "the deadline"}.</p>}
        {state?.message && !pending && <p role="alert" className="text-sm font-semibold text-error">{state.message}</p>}
      </div>
    </form>
  );
}
