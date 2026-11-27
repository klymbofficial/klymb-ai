/** Shown inside the company frame while a page's data is read. */
export default function OrgLoading() {
  return (
    <div aria-busy="true" aria-label="Loading" className="flex flex-col gap-6">
      <div className="h-9 w-64 animate-pulse bg-ink/10" />
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="h-28 animate-pulse bg-ink/10" />
        <div className="h-28 animate-pulse bg-ink/10" />
        <div className="h-28 animate-pulse bg-ink/10" />
      </div>
      <div className="h-56 animate-pulse bg-ink/5" />
    </div>
  );
}
