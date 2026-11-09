/** Shown the instant a learner opens the dashboard or a day, while the server gathers it. Not an empty state: nothing here says "no data". */
export default function LearnLoading() {
  return (
    <div role="status" aria-busy="true" className="mx-auto flex max-w-[96rem] flex-col gap-6 px-4 py-10 sm:px-8">
      <span className="sr-only">Loading your course…</span>
      <div aria-hidden="true" className="h-16 w-full animate-pulse rounded-card bg-surface" />
      <div aria-hidden="true" className="h-10 w-80 max-w-full animate-pulse rounded bg-surface" />
      <div aria-hidden="true" className="h-[28rem] animate-pulse rounded-slab bg-surface/70" />
    </div>
  );
}
