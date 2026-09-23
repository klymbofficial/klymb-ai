/** Shown the instant a learner opens the dashboard or a day, while the server gathers it. */
export default function LearnLoading() {
  return (
    <div aria-busy="true" aria-label="Loading" className="mx-auto flex max-w-[96rem] flex-col gap-6 px-4 py-10 sm:px-8">
      <div className="h-16 w-full animate-pulse rounded-card bg-surface" />
      <div className="h-10 w-80 animate-pulse rounded bg-surface" />
      <div className="h-[28rem] animate-pulse rounded-slab bg-surface/70" />
    </div>
  );
}
