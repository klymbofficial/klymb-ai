"use client";

import { useActionState } from "react";
import { createOwnTest, type CreateResult } from "@/app/org/[slug]/(workspace)/assessments/test-actions";
import { BTN_PRIMARY } from "@/components/company/HiringParts";
import { LIMITS, TEST_NAME_MAX } from "@/lib/company/assessment-rules";

const input = "w-full rounded-md border-2 border-line/50 bg-white px-3 py-2 text-sm focus:border-ink";

/** Name and role, then the editor opens. Everything else is written there. */
export function NewTestForm({ slug }: { slug: string }) {
  const [state, action, pending] = useActionState<CreateResult, FormData>(createOwnTest, null);
  return (
    <form action={action} className="flex max-w-xl flex-col gap-5">
      <input type="hidden" name="slug" value={slug} />
      <label className="flex flex-col gap-1 text-sm font-bold">
        Test name
        <input name="title" required maxLength={TEST_NAME_MAX} placeholder="e.g. Backend engineer take-home" className={input} />
      </label>
      <label className="flex flex-col gap-1 text-sm font-bold">
        Role it tests <span className="font-normal text-muted">(optional, you can add it later)</span>
        <input name="role" maxLength={LIMITS.role} placeholder="e.g. Backend engineer" className={input} />
      </label>
      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className={BTN_PRIMARY}>{pending ? "Creating…" : "Create and write the test"}</button>
      </div>
      {state && !state.ok && <p role="alert" className="text-sm font-semibold text-error">{state.message}</p>}
    </form>
  );
}
