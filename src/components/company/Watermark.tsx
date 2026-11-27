/**
 * Question watermarking (0099): the candidate's email, faint and repeated on
 * a slant across the whole test, so a screenshot or photo of it can be traced
 * back. It sits above the page but can't be clicked, selected or read aloud,
 * so answering works exactly as before.
 */
export function Watermark({ text }: { text: string }) {
  const safe = text.replace(/[<>&"']/g, "");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="360" height="200"><text x="20" y="120" transform="rotate(-24 180 100)" font-family="system-ui, sans-serif" font-size="15" fill="#000" fill-opacity="0.07">${safe}</text></svg>`;
  return (
    <div
      aria-hidden="true"
      data-watermark=""
      className="pointer-events-none fixed inset-0 z-40 select-none print:block"
      style={{ backgroundImage: `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`, backgroundRepeat: "repeat" }}
    />
  );
}
