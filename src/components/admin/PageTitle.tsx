export function PageTitle({ eyebrow, title, intro, actions }: { eyebrow: string; title: string; intro?: string; actions?: React.ReactNode }) {
  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-line/25 pb-5">
      <div>
        <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-red-deep">{eyebrow}</p>
        <h1 className="display mt-2 text-4xl">{title}</h1>
        {intro && <p className="mt-2 max-w-2xl text-sm text-muted">{intro}</p>}
      </div>
      {actions}
    </header>
  );
}
