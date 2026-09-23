/** Shown the instant an admin link is clicked, while the server gathers the page. */
export default function AdminLoading() {
  return (
    <div aria-busy="true" aria-label="Loading" className="flex flex-col gap-6">
      <div className="h-4 w-32 animate-pulse rounded bg-surface" />
      <div className="h-9 w-72 animate-pulse rounded bg-surface" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => <div key={i} className="h-28 animate-pulse rounded-card bg-surface/70" />)}
      </div>
      <div className="h-80 animate-pulse rounded-card bg-surface/70" />
    </div>
  );
}
