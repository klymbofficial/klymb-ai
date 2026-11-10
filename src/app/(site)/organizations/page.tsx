import type { Metadata } from "next";
import Link from "next/link";
import { Check, Minus } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { orgNotYet } from "@/data/public-story";
import { contact } from "@/data/config";

export const metadata: Metadata = {
  title: "Klymb for organizations",
  description: "Add your people, group them into teams, assign System Design and follow their progress.",
};

/** What the organization pages (/org/...) let a company do today. */
const steps = [
  { title: "People", body: "Add people one at a time or from a CSV. Each person is emailed how to sign in. Removing someone ends their access at once." },
  { title: "Teams", body: "Create teams, choose a head for each, and move people between them." },
  { title: "Learning", body: "Assign System Design to your people, then see who has started, lessons passed and final assessment scores." },
];

export default function OrganizationsPage() {
  return (
    <>
      <PageHeader eyebrow="For organizations" title="Upskill the people you already employ." intro="Klymb for organizations is for companies that want their own people to learn, not for hiring. You set up the group, and each person learns on their own time.">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <a href={`mailto:${contact.email}?subject=Klymb%20for%20organizations`} className="group inline-flex items-center justify-center gap-2 rounded-lg border-2 border-red-strong bg-red-strong px-5 py-3 text-sm font-bold text-white transition-[background-color,transform] duration-150 hover:bg-red-press active:scale-[0.97]">
            Write to {contact.email}
          </a>
          <ButtonLink href="/org/sign-in" variant="secondary" soft>Already invited? Sign in</ButtonLink>
        </div>
      </PageHeader>

      <Container className="py-14 sm:py-20">
        <SectionHeader id="can-title" eyebrow="What you can do today" title="Three pages, one clear job each." />
        <ol className="mt-10 grid gap-5 md:grid-cols-3">
          {steps.map((s, i) => (
            <li key={s.title} className="card flex gap-4 p-7">
              <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-full bg-ink text-sm font-bold text-white">{i + 1}</span>
              <div>
                <h3 className="display text-xl">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </Container>

      <section aria-labelledby="learners-title" className="border-y border-line/25 bg-white">
        <Container className="grid gap-10 py-14 sm:py-20 lg:grid-cols-2">
          <div>
            <SectionHeader id="learners-title" eyebrow="For the people learning" title="What your people get." />
            <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-muted">
              System Design is a course explained with real examples and built for interviews. Each person works through it on their own. The progress you see is theirs, recorded under the email they sign in with.
            </p>
            <Link href="/system-design" className="mt-4 inline-block text-sm font-bold underline underline-offset-4 hover:text-red-deep">See the System Design course</Link>
          </div>
          <ul className="space-y-3 text-[15px]">
            {["Live progress, not a report", "People sign in with an emailed code", "You stay in control of who has access"].map((t) => (
              <li key={t} className="flex gap-3"><Check aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-red-strong" />{t}</li>
            ))}
          </ul>
        </Container>
      </section>

      <Container className="py-14 sm:py-20">
        <SectionHeader id="not-title" eyebrow="Not available yet" title="What isn't built, said plainly." />
        <ul className="mt-8 max-w-2xl space-y-3 text-[15px] text-muted">
          {orgNotYet.map((t) => (
            <li key={t} className="flex gap-3"><Minus aria-hidden="true" className="mt-0.5 size-4 shrink-0" />{t}</li>
          ))}
        </ul>
        <p className="mt-6 max-w-2xl text-[15px] text-muted">
          Need one of these, or want to set up your company? Write to{" "}
          <a href={`mailto:${contact.email}`} className="font-semibold text-ink underline underline-offset-2">{contact.email}</a>.
        </p>
      </Container>
    </>
  );
}
