export function DemoNotice({ children }: { children?: React.ReactNode }) {
  return (
    <div role="note" className="border-b-2 border-ink bg-ink px-4 py-2 text-center text-xs font-bold uppercase tracking-wider text-paper">
      Demo preview with sample data · {children ?? "Nothing is saved yet"}
    </div>
  );
}
