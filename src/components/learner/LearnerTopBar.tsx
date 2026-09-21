import Image from "next/image";
import Link from "next/link";
import { signOutLearner } from "@/app/(learn)/learn/actions";

/** The signed-in bar shared by the dashboard and the day pages. */
export function LearnerTopBar({ name, image }: { name: string; image?: string | null }) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return (
    <header className="bg-card">
      <div className="mx-auto flex h-16 max-w-[96rem] items-center justify-between gap-4 px-4 sm:px-8">
        <Link href="/learn" aria-label="Klymb.ai dashboard" className="display inline-flex items-baseline text-xl">
          KLYMB<span className="text-red">.AI</span>
        </Link>

        <div className="flex items-center gap-3">
          {image ? (
            <Image
              src={image}
              alt=""
              width={36}
              height={36}
              className="size-9 rounded-full object-cover ring-2 ring-red/30"
            />
          ) : (
            <span aria-hidden="true" className="grid size-9 place-items-center rounded-full bg-surface text-xs font-extrabold ring-2 ring-red/30">
              {initials || "?"}
            </span>
          )}
          <span className="hidden text-xs font-extrabold uppercase tracking-[0.1em] sm:inline">{name}</span>
          <form action={signOutLearner}>
            <button
              type="submit"
              className="rounded-md bg-red-strong px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-white transition-colors hover:bg-red-deep"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
