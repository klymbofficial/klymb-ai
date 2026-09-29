import { Appear } from "@/components/motion/Appear";
import { Spotlight } from "@/components/effects/Spotlight";
import { EvalDemo } from "./EvalDemo";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { aiConcepts, evalMetrics, type ConceptGlyph } from "@/data/ai-foundations";

/*
 * Each concept gets a small line drawing on a dark tile, lit by a red glow:
 * the gallery treatment of vgpu.sh's examples, drawn in SVG so it costs
 * nothing to load and needs no GPU.
 */
const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round", strokeLinejoin: "round" } as const;

function Glyph({ kind }: { kind: ConceptGlyph }) {
  switch (kind) {
    case "rag":
      return (
        <g {...stroke}>
          {[0, 1, 2].map((i) => <rect key={i} x={22 + i * 7} y={30 - i * 7} width="34" height="42" rx="3" opacity={0.35 + i * 0.3} />)}
          <path d="M70 50h30" className="ai-flow" />
          <circle cx="112" cy="50" r="10" className="text-red" />
        </g>
      );
    case "agents":
      return (
        <g {...stroke}>
          <circle cx="70" cy="50" r="11" className="text-red" />
          {[[30, 24], [110, 24], [30, 76], [110, 76]].map(([x, y]) => (
            <g key={`${x}${y}`}>
              <path d={`M70 50L${x} ${y}`} className="ai-flow" opacity="0.6" />
              <rect x={x - 7} y={y - 7} width="14" height="14" rx="3" />
            </g>
          ))}
        </g>
      );
    case "llmops":
      return (
        <g {...stroke}>
          <path d="M18 78h104M18 78V22" opacity="0.4" />
          <path d="M22 66l18-10 16 6 18-22 16 8 18-18 12 4" className="ai-flow text-red" />
          {[40, 56, 74, 90, 108].map((x, i) => <circle key={x} cx={x} cy={[56, 62, 40, 48, 30][i]} r="2.4" fill="currentColor" />)}
        </g>
      );
    case "evals":
      return (
        <g {...stroke}>
          {[0, 1, 2].map((i) => (
            <g key={i}>
              <rect x="26" y={24 + i * 20} width="12" height="12" rx="2" />
              <path d={`M48 ${30 + i * 20}h${[62, 48, 56][i]}`} opacity="0.5" />
            </g>
          ))}
          <path d="M28 30l3 3 5-6M28 50l3 3 5-6" className="text-red" />
          <path d="M28 66l8 8M36 66l-8 8" />
        </g>
      );
    case "safety":
      return (
        <g {...stroke}>
          <path d="M70 18l30 11v19c0 18-13 29-30 35-17-6-30-17-30-35V29z" />
          <path d="M58 50l8 8 16-17" className="ai-flow text-red" />
        </g>
      );
    case "guardrails":
      return (
        <g {...stroke}>
          <path d="M16 50h108" className="ai-flow" strokeDasharray="4 6" />
          <path d="M16 30h108M16 70h108" className="text-red" />
          {[34, 70, 106].map((x) => <path key={x} d={`M${x} 30v40`} opacity="0.45" />)}
        </g>
      );
  }
}

export function AiFoundations() {
  return (
    <section id="ai-foundations" aria-labelledby="ai-title" className="mx-auto max-w-7xl scroll-mt-24 px-4 py-16 sm:px-6 sm:py-20">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div className="max-w-2xl">
          <Eyebrow>In every track</Eyebrow>
          <h2 id="ai-title" className="display mt-3 text-[clamp(1.75rem,3.6vw,2.6rem)] text-balance">
            The AI fundamentals your next team will expect.
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-muted">
            Whichever role you choose, you learn how modern AI features are built, run and checked, and how to judge an
            answer before anyone relies on it.
          </p>
        </div>
      </div>

      <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {aiConcepts.map((c, i) => (
          <li key={c.name}>
            <Appear delay={(i % 3) * 0.06} className="h-full">
              <Spotlight className="h-full rounded-card">
              <article className="card group flex h-full flex-col overflow-hidden transition-[transform,box-shadow] duration-200 hover:-translate-y-1 hover:shadow-float">
                <div className="relative grid aspect-[16/8] place-items-center overflow-hidden bg-night text-white/85">
                  <span aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(60%_70%_at_50%_60%,rgb(226_46_27/0.28),transparent_70%)] opacity-70 transition-opacity duration-500 group-hover:opacity-100" />
                  <svg viewBox="0 0 140 100" className="relative h-[62%] w-auto" aria-hidden="true"><Glyph kind={c.glyph} /></svg>
                </div>
                <div className="flex flex-1 flex-col gap-4 p-6">
                  <div>
                    <h3 className="text-lg font-extrabold">{c.name}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted">{c.summary}</p>
                  </div>
                  <ul className="mt-auto flex flex-wrap gap-1.5">
                    {c.tags.map((t) => (
                      <li key={t} className="rounded-full bg-surface px-2.5 py-1 text-xs font-semibold">{t}</li>
                    ))}
                  </ul>
                </div>
              </article>
              </Spotlight>
            </Appear>
          </li>
        ))}
      </ul>

      <Appear className="mt-6 overflow-hidden rounded-slab bg-night text-paper shadow-float">
        <Spotlight tone="white" className="rounded-slab">
        <div className="relative z-[2] grid gap-8 p-8 sm:p-10 lg:grid-cols-[1fr_2fr] lg:items-center lg:p-12">
          <div>
            <Eyebrow tone="light">LLM evaluation</Eyebrow>
            <p className="display mt-3 text-[clamp(1.5rem,2.8vw,2.1rem)] leading-tight">Six questions to ask of every AI answer.</p>
            <p className="mt-3 text-sm leading-relaxed text-white/65">
              You score real model output against these, then decide whether it is good enough to ship.
            </p>
          </div>
          <ol className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            {evalMetrics.map((m, i) => (
              <li key={m.name} className="rounded-card bg-white/[0.06] p-4 transition-colors hover:bg-white/[0.1]">
                <span className="text-xs font-extrabold tracking-[0.16em] text-red nums">{String(i + 1).padStart(2, "0")}</span>
                <p className="mt-1 font-extrabold">{m.name}</p>
                <p className="mt-1 text-[13px] leading-snug text-white/65">{m.question}</p>
              </li>
            ))}
          </ol>
        </div>
        </Spotlight>
      </Appear>

      <Appear><EvalDemo /></Appear>
    </section>
  );
}
