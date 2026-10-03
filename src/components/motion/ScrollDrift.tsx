/**
 * A photo that drifts slightly against the scroll while its frame crosses the
 * screen: the parallax on string-tune.fiddle.digital. Pure CSS scroll-driven
 * animation (`.scroll-drift` in globals.css); still where unsupported.
 */
export function ScrollDrift({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <div className="scroll-drift absolute inset-0">{children}</div>
    </div>
  );
}
