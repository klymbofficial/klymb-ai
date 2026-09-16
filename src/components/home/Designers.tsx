import { demoDesigners, designerDemoEnabled, designers, designStandard } from "@/data/designers";
import { SectionHeader } from "@/components/ui/SectionHeader";

/**
 * Renders named designers once real, consented entries exist.
 * Until then it makes the honest argument instead of an empty grid.
 */
export function Designers() {
  const isDemo = designers.length === 0 && designerDemoEnabled;
  const people = isDemo ? demoDesigners : designers;

  if (people.length === 0) {
    return (
      <section aria-labelledby="standard-title" className="border-b-2 border-line py-14 sm:py-20">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[1fr_1.3fr]">
          <SectionHeader id="standard-title" eyebrow={designStandard.eyebrow} title={designStandard.title} />
          <ul className="border-t-2 border-line">
            {designStandard.points.map((p) => (
              <li key={p} className="flex items-baseline gap-4 border-b-2 border-line py-4">
                <span aria-hidden="true" className="font-black text-red-deep">✓</span>
                <span className="text-lg font-semibold">{p}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    );
  }

  return (
    <section aria-labelledby="designers-title" className="border-b-2 border-line py-14 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {isDemo && (
          <p role="note" className="mb-6 border-2 border-ink bg-ink px-4 py-2 text-center text-xs font-bold uppercase tracking-wider text-paper">
            Layout demo · advisors not yet confirmed · not for publication
          </p>
        )}
        <SectionHeader
          id="designers-title"
          eyebrow="Who designed this"
          title="The people behind the 30 days"
          intro="Each person below shaped a specific part of the program. Their employer is listed to identify them, and does not imply that company endorses Klymb.ai."
        />
        <ul className="mt-10 grid gap-0.5 border-2 border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
          {people.map((d) => (
            <li key={d.name} className="flex flex-col gap-3 bg-paper p-6">
              <p className="display text-2xl">{d.name}</p>
              <p className="text-sm font-bold text-red-deep">
                {d.current ? d.title : `Formerly ${d.title}`}, {d.company}
              </p>
              <p className="text-sm text-muted">{d.contribution}</p>
              {d.linkedin && (
                <a href={d.linkedin} target="_blank" rel="noopener noreferrer" className="mt-auto text-xs font-bold uppercase tracking-wider underline underline-offset-4 hover:text-red-deep">
                  LinkedIn profile
                </a>
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
