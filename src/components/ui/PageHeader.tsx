import { Container } from "./Container";
import { Eyebrow } from "./Eyebrow";

export function PageHeader({ eyebrow, title, intro, children }: { eyebrow: string; title: React.ReactNode; intro?: string; children?: React.ReactNode }) {
  return (
    <header className="border-b border-line/25">
      <Container className="py-14 sm:py-20">
        <Eyebrow>{eyebrow}</Eyebrow>
        <h1 className="display mt-4 max-w-4xl text-4xl text-balance break-words hyphens-auto min-[420px]:text-5xl sm:text-6xl lg:text-7xl">{title}</h1>
        {intro && <p className="mt-5 max-w-2xl text-lg text-muted text-pretty">{intro}</p>}
        {children && <div className="mt-8">{children}</div>}
      </Container>
    </header>
  );
}
