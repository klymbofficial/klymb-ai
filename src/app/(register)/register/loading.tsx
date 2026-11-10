/** Shown while the page checks who is signed in. Not an empty state: nothing here says "no data". */
export default function RegisterLoading() {
  return (
    <div role="status" aria-busy="true" className="grid min-h-dvh lg:grid-cols-[2fr_3fr]">
      <span className="sr-only">Loading registration…</span>
      <div aria-hidden="true" className="h-56 animate-pulse bg-red-muted/90 lg:h-auto" />
      <div aria-hidden="true" className="flex flex-col gap-4 px-5 py-10 sm:px-10 lg:px-16">
        <div className="h-6 w-28 animate-pulse rounded bg-surface" />
        <div className="h-24 w-full max-w-2xl animate-pulse rounded-card bg-surface/70" />
        <div className="h-9 w-72 max-w-full animate-pulse rounded bg-surface" />
        <div className="h-72 w-full max-w-2xl animate-pulse rounded-card bg-surface/70" />
      </div>
    </div>
  );
}
