"use client";

import { useActionState } from "react";
import { motion } from "motion/react";
import { ArrowUpRight } from "lucide-react";
import { saveEvidenceProfile } from "@/app/(learn)/learn/actions";
import { Button } from "@/components/ui/Button";
import { GitHubMark, LinkedInMark } from "@/components/ui/BrandMarks";

const input =
  "block w-full rounded-md border border-line/40 bg-card py-2.5 pr-3 pl-10 text-sm transition-[border-color,box-shadow] duration-200 placeholder:text-muted/70 hover:border-line/70 focus:border-ink/60 focus:ring-4 focus:ring-ink/5 focus:outline-none";

const EASE = [0.2, 0.7, 0.3, 1] as const;

/**
 * The learner's GitHub and LinkedIn, in one place: where they declare the
 * accounts (every submitted link is checked against these) and where they
 * open them. Sits on the page ground; it is secondary to the board above.
 */
export function EvidenceProfile({
  githubUsername, linkedinSlug, githubUrl, linkedinUrl,
}: { githubUsername: string | null; linkedinSlug: string | null; githubUrl: string | null; linkedinUrl: string | null }) {
  const [state, action, pending] = useActionState(saveEvidenceProfile, null as { error?: string; saved?: boolean } | null);
  const complete = !!githubUsername && !!linkedinSlug;

  const fields = [
    {
      id: "github", label: "GitHub", value: githubUsername, url: githubUrl, linkText: githubUrl?.replace(/^https?:\/\//, ""),
      placeholder: "https://github.com/your-username", hint: "Add it on Day 1: it is where every artifact lands.",
      mark: <GitHubMark className="size-4 text-ink/75" />,
    },
    {
      id: "linkedin", label: "LinkedIn", value: linkedinSlug, url: linkedinUrl, linkText: "View profile",
      placeholder: "https://www.linkedin.com/in/yourname", hint: "Update your headline this week.",
      mark: <LinkedInMark className="size-4 text-[#0a66c2]" />,
    },
  ];

  return (
    <form action={action} className="max-w-3xl">
      <h2 id="evidence" className="text-lg font-bold">Your accounts</h2>
      <p className="mt-1 text-sm leading-relaxed text-muted">
        {complete
          ? "Every link you submit is checked against these, so nothing in your portfolio can belong to someone else."
          : "Add these before your first submission. Paste your full profile links: we read the account name from them."}
      </p>

      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        {fields.map((f, i) => (
          <motion.div
            key={f.id}
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.4, delay: 0.1 + i * 0.08, ease: EASE }}
          >
            <label htmlFor={f.id} className="block text-sm font-semibold">{f.label}</label>
            <div className="relative mt-2">
              <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2">{f.mark}</span>
              <input
                id={f.id} name={f.id} defaultValue={f.value ?? ""} spellCheck={false} autoComplete="off"
                placeholder={f.placeholder}
                className={input}
              />
            </div>
            <p className="mt-1.5 text-xs text-muted">
              {f.url ? (
                <a href={f.url} target="_blank" rel="noopener noreferrer" className="group inline-flex max-w-full items-center gap-1 font-medium hover:text-ink">
                  <span className="truncate underline underline-offset-4">{f.linkText}</span>
                  <ArrowUpRight aria-hidden="true" className="size-3.5 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </a>
              ) : f.hint}
            </p>
          </motion.div>
        ))}
      </div>

      {state?.error && <p role="alert" className="mt-4 rounded-md border border-error bg-error-tint p-3 text-sm font-semibold text-error">{state.error}</p>}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Button
          type="submit" variant={complete ? "secondary" : "primary"} disabled={pending} aria-busy={pending}
          className="rounded-md px-4! py-2! text-xs!"
        >
          {pending ? "Saving…" : complete ? "Update" : "Save accounts"}
        </Button>
        <p role="status" aria-live="polite" className="text-xs text-muted">
          {state?.saved ? "Saved." : complete ? `Checking against ${githubUsername} and ${linkedinSlug}` : "Required before you submit Day 1"}
        </p>
      </div>
    </form>
  );
}
