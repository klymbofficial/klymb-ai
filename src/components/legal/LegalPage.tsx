import { Container } from "@/components/ui/Container";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { policyVersion } from "@/data/legal";

export function LegalPage({ title, intro, children }: { title: string; intro: string; children: React.ReactNode }) {
  return (
    <>
      <header className="border-b-2 border-line">
        <Container className="py-12 sm:py-16">
          <Eyebrow>Klymb.ai · legal</Eyebrow>
          <h1 className="display mt-4 max-w-3xl text-5xl text-balance sm:text-6xl">{title}</h1>
          <p className="mt-5 max-w-2xl text-lg text-muted text-pretty">{intro}</p>
          <p className="mt-4 text-xs font-bold uppercase tracking-wider text-muted">
            Version {policyVersion.version} · Effective {policyVersion.effective}
          </p>
        </Container>
      </header>
      <Container className="py-12 sm:py-16">
        <div className="legal max-w-[70ch]">{children}</div>
      </Container>
    </>
  );
}

export function Section({ n, title, plain, children }: { n: string; title: string; plain?: string; children: React.ReactNode }) {
  return (
    <section className="border-t-2 border-line pt-8 first:border-t-0 first:pt-0">
      <h2 className="display text-2xl">
        <span className="mr-2 text-red">{n}</span>{title}
      </h2>
      {plain && (
        <p className="mt-3 border-l-2 border-red-strong bg-red-tint px-4 py-3 text-sm">
          <strong>In plain English:</strong> {plain}
        </p>
      )}
      <div className="mt-4 flex flex-col gap-4">{children}</div>
    </section>
  );
}

export function Facts({ rows }: { rows: readonly (readonly [string, string])[] }) {
  return (
    <div className="overflow-x-auto border-2 border-line">
      <table className="w-full min-w-[420px] text-left text-sm">
        <tbody>
          {rows.map(([k, v]) => (
            <tr key={k} className="border-b border-line last:border-0">
              <th scope="row" className="w-2/5 bg-surface p-3 align-top font-bold">{k}</th>
              <td className="p-3">{v}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
