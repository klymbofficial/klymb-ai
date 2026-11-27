import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { CounselingBooking } from "@/components/counseling/CounselingBooking";
import "./counseling.css";

export const metadata: Metadata = {
  title: "Free career counseling for IT freshers",
  description: "Just passed out? Book a free one-on-one career call with Klymb.ai, any evening from 5 to 9 PM, and join our free community of IT professionals.",
};

/** The profile's three facts, shown like a booking page's stats. */
const facts = [
  { value: "Free", label: "No fee" },
  { value: "1:1", label: "Just you" },
  { value: "5–9 PM", label: "Evenings" },
];

/** What freshers usually come with. */
const asks = ["Which role suits me?", "No callbacks yet", "Fixing my resume", "Off-campus jobs", "DSA or projects?", "Service or product company?"];

const faqs = [
  { q: "Who is it for?", a: "IT and CS freshers, and final-year students." },
  { q: "Is it really free?", a: "Yes. The call and the community are both free." },
  { q: "What happens after I book?", a: "Our team WhatsApps you to confirm your time, then you get your one-on-one call." },
];

function Asks({ chip }: { chip: string }) {
  return (
    <ul className="mt-3 flex flex-wrap gap-2">
      {asks.map((a) => <li key={a} className={`rounded-full px-3 py-1.5 text-sm font-semibold ${chip}`}>{a}</li>)}
    </ul>
  );
}

export default function CounselingPage() {
  return (
    <div className="cs-page pb-28 lg:pb-0">
      <Container className="grid max-w-5xl gap-6 pt-6 sm:pt-10 lg:grid-cols-[22rem_1fr] lg:items-start lg:gap-10 lg:py-16">
        {/* The profile, as on a 1:1 booking page. */}
        <section className="cs-profile overflow-hidden rounded-slab bg-card lg:sticky lg:top-28" aria-labelledby="cs-title">
          <div className="cs-profile-top px-5 pb-5 pt-6">
            <div className="flex items-center gap-4">
              <span aria-hidden="true" className="display grid size-[4.5rem] shrink-0 place-items-center rounded-full bg-red-strong text-3xl text-white ring-4 ring-white">
                <span>K<span className="text-red-soft">.</span></span>
              </span>
              <dl className="grid flex-1 grid-cols-3 gap-2">
                {facts.map((f) => (
                  <div key={f.label} className="flex flex-col-reverse">
                    <dt className="text-xs text-muted">{f.label}</dt>
                    <dd className="whitespace-nowrap font-heading text-lg font-extrabold leading-tight sm:text-xl lg:text-lg">{f.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <h1 id="cs-title" className="display mt-5 text-[1.9rem] leading-[1.05]">Free career counseling</h1>
            <p className="mt-1.5 text-[15px] text-ink/80">For IT freshers who just passed out.</p>
          </div>
          <div className="hidden px-5 py-5 lg:block">
            <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-muted">Freshers ask about</p>
            <Asks chip="bg-surface/70" />
          </div>
        </section>

        <div className="grid gap-8">
          <section aria-labelledby="cs-book">
            <h2 id="cs-book" className="sr-only">Book a session</h2>
            <CounselingBooking />
          </section>

          <section className="lg:hidden" aria-labelledby="cs-asks">
            <h2 id="cs-asks" className="text-xs font-extrabold uppercase tracking-[0.14em] text-muted">Freshers ask about</h2>
            <Asks chip="bg-card" />
          </section>

          <section aria-labelledby="cs-faq">
            <h2 id="cs-faq" className="text-xs font-extrabold uppercase tracking-[0.14em] text-muted">Questions</h2>
            <div className="mt-3 divide-y divide-line/20 rounded-card bg-card">
              {faqs.map((f) => (
                <details key={f.q} className="cs-faq group px-5 py-4">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-bold">
                    {f.q}
                    <span aria-hidden="true" className="text-xl leading-none text-muted transition-transform duration-200 group-open:rotate-45">+</span>
                  </summary>
                  <p className="mt-2 text-[15px] text-muted">{f.a}</p>
                </details>
              ))}
            </div>
          </section>
        </div>
      </Container>
    </div>
  );
}
