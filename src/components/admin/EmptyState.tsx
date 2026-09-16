export function EmptyState({ title, body, children }: { title: string; body: string; children?: React.ReactNode }) {
  return (
    <div className="border-2 border-dashed border-line bg-paper p-10 text-center">
      <p className="display text-2xl">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted">{body}</p>
      {children && <div className="mt-5">{children}</div>}
    </div>
  );
}
