/**
 * Text that writes itself in as it scrolls through the viewport: each word
 * goes from faint to full as the reader scrolls past it, the effect on
 * string-tune.fiddle.digital. Pure CSS scroll-driven animation (`.scrub` in
 * globals.css): browsers without it, and reduced motion, show plain text.
 */
export function ScrubText({ text, className }: { text: string; className?: string }) {
  const words = text.split(" ");
  return (
    <p className={`scrub ${className ?? ""}`}>
      <span className="sr-only">{text}</span>
      {words.map((w, i) => (
        <span key={i} aria-hidden="true">
          <span className="scrub-word" style={{ "--i": i, "--n": words.length } as React.CSSProperties}>{w}</span>{" "}
        </span>
      ))}
    </p>
  );
}
