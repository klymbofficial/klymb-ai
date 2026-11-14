"use client";

import { createContext, useContext } from "react";
import type { CourseState } from "@/lib/course-app";
import { Icon } from "./icons";
import type { Act } from "./useCourseApp";

/** The learners' WhatsApp group link: read on the server, and only there for someone who paid. */
const Ctx = createContext<string | null>(null);
export const GroupProvider = Ctx.Provider;
export const useGroupLink = () => useContext(Ctx);

const seen = (p: CourseState): CourseState => ({ ...p, groupSeen: true });

/** The link itself: a new tab, so the course stays open behind it. */
function JoinLink({ href, act, className, children }: { href: string; act: Act; className: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" onClick={() => act(seen)} className={className}>
      {children}
    </a>
  );
}

/** On Home until they join or close it. The inbox keeps the link after that. */
export function GroupCard({ s, act }: { s: CourseState; act: Act }) {
  const href = useGroupLink();
  if (!href || s.groupSeen) return null;
  return (
    <div className="sd-a-in flex flex-wrap items-center gap-x-3 gap-y-2.5 rounded-xl border-2 border-sd-divider px-4 py-3.5" style={{ animationDuration: ".5s", animationDelay: "40ms" }}>
      <span className="flex size-9 flex-none items-center justify-center rounded-lg bg-sd-ink text-sd-bg"><Icon name="msg" size={18} /></span>
      <span className="flex min-w-0 flex-[1_1_200px] flex-col gap-0.5">
        <span className="text-[15px] leading-[1.25] font-extrabold">Join the learners’ WhatsApp group</span>
        <span className="text-[13px] leading-[1.35] text-sd-n-800">Ask doubts and learn with the rest of the batch.</span>
      </span>
      <span className="flex flex-none items-center gap-1">
        <JoinLink href={href} act={act} className="sd-btn sd-btn-primary h-10 gap-1.5">Join<Icon name="arrowR" size={16} /></JoinLink>
        <button type="button" onClick={() => act(seen)} aria-label="Hide the WhatsApp group card" className="sd-btn sd-btn-ghost size-10 justify-center p-0"><Icon name="x" size={16} /></button>
      </span>
    </div>
  );
}

/** After the commitment, before Day 1: the one place every new paid learner passes. */
export function GroupStep({ act }: { act: Act }) {
  const href = useGroupLink();
  if (!href) return null;
  return (
    <JoinLink href={href} act={act} className="sd-a-in flex items-center gap-3 rounded-xl border-2 border-sd-divider px-3.5 py-3 text-sd-ink no-underline hover:bg-sd-accent-100">
      <span className="flex size-9 flex-none items-center justify-center rounded-lg bg-sd-ink text-sd-bg"><Icon name="msg" size={18} /></span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-[15px] leading-[1.25] font-extrabold">Join the learners’ WhatsApp group</span>
        <span className="text-[13px] leading-[1.35] text-sd-n-700">Ask doubts and learn with the batch.</span>
      </span>
      <Icon name="arrowR" size={18} />
    </JoinLink>
  );
}

/** The inbox entry: always there for a paid learner, unread until they join or close the Home card. */
export function GroupNotice({ s, act }: { s: CourseState; act: Act }) {
  const href = useGroupLink();
  if (!href) return null;
  return (
    <JoinLink href={href} act={act} className={`sd-a-in grid w-full grid-cols-[36px_1fr_8px] items-start gap-3 border-b border-sd-divider px-2 py-3.5 text-left text-sd-ink no-underline hover:bg-sd-n-200 ${s.groupSeen ? "" : "bg-sd-accent-100"}`}>
      <span className={`flex size-9 items-center justify-center rounded-lg text-sd-bg ${s.groupSeen ? "bg-sd-ink" : "bg-sd-accent"}`}><Icon name="msg" size={18} /></span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="text-sm leading-[1.3] font-extrabold">Join the learners’ WhatsApp group</span>
        <span className="text-[13px] leading-[1.4] text-sd-n-800">Ask doubts, share your designs and keep each other going. Tap to join.</span>
      </span>
      {!s.groupSeen && <span className="mt-1.5 size-2 rounded-full bg-sd-accent"><span className="sr-only">Unread</span></span>}
    </JoinLink>
  );
}
