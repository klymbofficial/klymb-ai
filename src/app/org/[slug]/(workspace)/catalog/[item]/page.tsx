import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MetaLine, SkillChips } from "@/components/company/CatalogParts";
import { LoadError, RoleOnly } from "@/components/company/OrgPanels";
import { KIND_LABEL, PURPOSE_LABEL } from "@/data/business-catalog";
import { isAdmin } from "@/lib/company/access";
import { companyStandings, loadVersions } from "@/lib/company/assessment-data";
import { minutesLabel, seesAssessments, standingLabel } from "@/lib/company/assessment-rules";
import { requireCompany } from "@/lib/company/auth";
import { seesCatalog } from "@/lib/company/catalog";
import { companyCatalog } from "@/lib/company/catalog-data";
import { db } from "@/lib/db/client";

export const metadata: Metadata = { title: "Catalog item", robots: { index: false, follow: false } };

const section = "border-t border-line/30 pt-5";
const h2 = "text-xs font-extrabold uppercase tracking-[0.14em] text-muted";
const link = "font-bold underline underline-offset-4 hover:text-red-deep";

/**
 * One catalog item, for the people who choose: what it's for, who takes it,
 * how long it is, what it covers, and a look inside (a course's lessons, a
 * test's rubric summary, tools and practice task). The one action is
 * assigning, for an admin on a course they can assign. An item this company
 * can't see, a draft included, is a 404 like one that doesn't exist.
 */
export default async function CatalogItemPage({ params }: { params: Promise<{ slug: string; item: string }> }) {
  const { slug, item: itemSlug } = await params;
  const member = await requireCompany(slug);
  const base = `/org/${member.companySlug}/catalog`;
  if (!seesCatalog(member)) return <RoleOnly role="people who choose courses and tests" home={`/org/${member.companySlug}`} />;

  const sql = db();
  // Klymb's catalog: a company's own tests live on Assessments only.
  const entries = sql ? (await companyCatalog(sql, member.companyId))?.filter((e) => !e.own) ?? null : null;
  if (!entries) return <LoadError what="This item" />;
  const entry = entries.find((e) => e.item.slug === itemSlug);
  if (!entry) notFound();

  const visible = new Map(entries.map((e) => [e.item.slug, e]));
  const { item } = entry;
  const inPrograms = entries.filter((e) => e.item.kind === "program" && e.item.steps.includes(item.slug));
  const linkTo = (s: string) => {
    const e = visible.get(s);
    return e ? <Link href={`${base}/${s}`} className={link}>{e.item.title}</Link> : null;
  };
  const related =
    item.kind === "assessment"
      ? [
          item.followUp && { label: "Follow-up course", slug: item.followUp },
          item.prep && { label: "Prep course", slug: item.prep },
        ].filter((r): r is { label: string; slug: string } => !!r)
      : [];
  const canAssign = item.kind === "course" && item.assignable && isAdmin(member);

  // An assessment shows its newest published version's areas, tools and practice task; the listing until there is one.
  // Never the real task or the scoring guide: a team lead may read this page.
  const versions = item.kind === "assessment" && sql ? await loadVersions(sql, item.slug) : null;
  const latest = versions?.[0];
  const standing = item.kind === "assessment" && sql && seesAssessments(member) ? (await companyStandings(sql, member.companyId, [item.slug]))?.get(item.slug) : undefined;
  const test =
    item.kind === "assessment"
      ? latest
        ? { areas: latest.rubric.map((c) => c.title), tools: { allowed: latest.toolsAllowed, notAllowed: latest.toolsNotAllowed }, sample: { title: latest.sampleTitle, brief: latest.sampleBrief } }
        : { areas: [...item.rubric], tools: item.tools, sample: item.sampleTask }
      : null;

  return (
    <>
      <Link href={base} className="text-sm font-bold underline underline-offset-4 hover:text-red-deep">← Catalog</Link>

      <header className="mt-4 mb-8 flex flex-col gap-3">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-muted">{KIND_LABEL[item.kind]}</p>
        <h1 className="display text-3xl">{item.title}</h1>
        {item.summary && <p className="max-w-2xl text-sm">{item.summary}</p>}
        {item.kind === "assessment" && latest ? <p className="text-xs text-muted">{item.audience} · {item.level} · {minutesLabel(latest.minutes)}</p> : <MetaLine entry={entry} />}
        <SkillChips skills={entry.skills} hrefFor={(s) => `${base}?purpose=all&skill=${encodeURIComponent(s)}`} />
        {canAssign && (
          <Link
            href={`/org/${member.companySlug}/learning`}
            className="mt-2 self-start border-2 border-red-strong bg-red-strong px-5 py-2.5 text-sm font-bold text-white hover:border-red-press hover:bg-red-press"
          >
            Assign course
          </Link>
        )}
        {item.kind === "course" && item.assignable && !isAdmin(member) && <p className="text-xs text-muted">Your company admin assigns courses.</p>}
        {item.kind === "assessment" &&
          (standing ? (
            <p className="text-sm font-semibold">
              {standingLabel(standing)} ·{" "}
              <Link href={`/org/${member.companySlug}/assessments/${item.slug}`} className={link}>Open the test</Link>
            </p>
          ) : (
            <p className="text-sm font-semibold">Recruiters and reviewers open the full test.</p>
          ))}
      </header>

      <div className="grid gap-x-10 gap-y-8 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-8">
          {item.kind !== "program" && (
            <section className={section} aria-labelledby="outcomes">
              <h2 id="outcomes" className={h2}>Outcomes</h2>
              <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm">{item.outcomes.map((o) => <li key={o}>{o}</li>)}</ul>
            </section>
          )}

          {item.kind === "course" && (
            <section className={section} aria-labelledby="lessons">
              <h2 id="lessons" className={h2}>Lessons</h2>
              <ol className="mt-3 space-y-4">
                {item.preview.modules.map((m) => (
                  <li key={m.title}>
                    <h3 className="text-sm font-bold">{m.title}</h3>
                    <ol className="mt-1.5 list-decimal space-y-0.5 pl-5 text-sm text-muted">{m.lessons.map((l) => <li key={l}>{l}</li>)}</ol>
                  </li>
                ))}
              </ol>
              <a href={item.preview.pageHref} target="_blank" rel="noreferrer" className={`mt-4 inline-block text-sm ${link}`}>
                Open course page<span className="sr-only"> (new tab)</span>
              </a>
            </section>
          )}

          {test && (
            <>
              <section className={section} aria-labelledby="rubric">
                <h2 id="rubric" className={h2}>Rubric summary</h2>
                <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm">{test.areas.map((r) => <li key={r}>{r}</li>)}</ul>
              </section>
              <section className={section} aria-labelledby="practice">
                <h2 id="practice" className={h2}>Practice task</h2>
                <h3 className="mt-3 text-base font-bold">{test.sample.title}</h3>
                <p className="mt-1.5 whitespace-pre-line text-sm">{test.sample.brief}</p>
                <p className="mt-2 text-xs text-muted">Practice only. The real task differs.</p>
              </section>
            </>
          )}

          {item.kind === "program" && (
            <section className={section} aria-labelledby="steps">
              <h2 id="steps" className={h2}>Steps</h2>
              {item.steps.length ? (
                <ol className="mt-3 space-y-4">
                  {item.steps.map((s, i) => {
                    const step = visible.get(s);
                    return step ? (
                      <li key={s} className="flex gap-4">
                        <span className="display w-6 shrink-0 text-lg tabular-nums">{i + 1}</span>
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-muted">{KIND_LABEL[step.item.kind]}</span>
                          {linkTo(s)}
                          <MetaLine entry={step} />
                        </div>
                      </li>
                    ) : null;
                  })}
                </ol>
              ) : (
                <p className="mt-3 text-sm text-muted">No steps available yet.</p>
              )}
            </section>
          )}
        </div>

        <aside className="flex flex-col gap-8">
          <section className={section} aria-labelledby="details">
            <h2 id="details" className={h2}>Details</h2>
            <dl className="mt-3 space-y-3 text-sm">
              {item.kind !== "program" && <Fact label="Purpose">{item.purpose}</Fact>}
              {item.kind === "assessment" && <Fact label="Format">{item.format}</Fact>}
              {entry.purposes.length > 0 && <Fact label="Used for">{entry.purposes.map((p) => PURPOSE_LABEL[p]).join(", ")}</Fact>}
              <Fact label="Author">{item.author}</Fact>
            </dl>
          </section>

          {test && (
            <section className={section} aria-labelledby="tools">
              <h2 id="tools" className={h2}>Tools</h2>
              <dl className="mt-3 space-y-3 text-sm">
                {test.tools.allowed.length > 0 && <Fact label="Allowed">{test.tools.allowed.join("; ")}</Fact>}
                {test.tools.notAllowed.length > 0 && <Fact label="Not allowed">{test.tools.notAllowed.join("; ")}</Fact>}
              </dl>
            </section>
          )}

          {related.length > 0 && (
            <section className={section} aria-labelledby="related">
              <h2 id="related" className={h2}>Related</h2>
              <dl className="mt-3 space-y-3 text-sm">
                {related.map((r) => (
                  <Fact key={r.label} label={r.label}>{linkTo(r.slug) ?? <span className="text-muted">Not in your catalog</span>}</Fact>
                ))}
              </dl>
            </section>
          )}

          {inPrograms.length > 0 && (
            <section className={section} aria-labelledby="programs">
              <h2 id="programs" className={h2}>In programs</h2>
              <ul className="mt-3 space-y-1 text-sm">{inPrograms.map((p) => <li key={p.item.slug}>{linkTo(p.item.slug)}</li>)}</ul>
            </section>
          )}
        </aside>
      </div>
    </>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-bold text-muted">{label}</dt>
      <dd className="mt-0.5">{children}</dd>
    </div>
  );
}
