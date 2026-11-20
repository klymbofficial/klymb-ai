import type { CSSProperties } from "react";
import type { Headline } from "@/data/workshop";

/** Four torn bottom edges, so a row of cuttings doesn't repeat itself. */
const TORN = [
  "polygon(0 0,100% 0,100% 96%,94% 100%,86% 97%,77% 100%,68% 96%,58% 100%,48% 97%,38% 100%,28% 96%,18% 100%,9% 97%,0 100%)",
  "polygon(0 0,100% 0,100% 97%,92% 100%,83% 96%,74% 100%,64% 97%,55% 100%,45% 96%,35% 100%,25% 97%,15% 100%,6% 96%,0 100%)",
  "polygon(0 0,100% 0,100% 96%,93% 100%,85% 97%,76% 100%,66% 96%,57% 100%,47% 97%,37% 100%,27% 96%,17% 100%,8% 97%,0 100%)",
  "polygon(0 0,100% 0,100% 97%,91% 100%,82% 96%,73% 100%,63% 97%,54% 100%,44% 96%,34% 100%,24% 97%,14% 100%,5% 96%,0 100%)",
];

/**
 * A newspaper cutting that links to the story. On a phone the tilt goes, so
 * the column reads straight; on a wide screen it straightens on hover.
 */
export function Clipping({ item, index }: { item: Headline; index: number }) {
  const style = {
    "--tilt": `${item.tilt}deg`,
    clipPath: TORN[index % TORN.length],
    marginTop: item.drop ? `${item.drop}px` : undefined,
  } as CSSProperties;
  return (
    <a
      href={item.href}
      target="_blank"
      rel="noopener noreferrer"
      style={style}
      className="grid gap-3 bg-[#fbfaf7] px-5 pb-7 pt-5 text-[#1c1b1a] no-underline transition-transform duration-200 hover:text-[#1c1b1a] md:[transform:rotate(var(--tilt))] md:hover:[transform:rotate(0deg)_scale(1.02)]"
    >
      <span className="flex justify-between gap-2 border-b-[3px] border-double border-[#1c1b1a] pb-2 text-[11px] uppercase tracking-[0.14em]">
        <strong>{item.outlet}</strong>
        <span>{item.when}</span>
      </span>
      <strong className="font-[Georgia,'Times_New_Roman',serif] text-2xl font-bold leading-[1.12] tracking-[-0.01em]">{item.title}</strong>
      <span className="font-[Georgia,serif] text-[15px] leading-[1.45] text-[#4a4744]">{item.blurb}</span>
    </a>
  );
}
