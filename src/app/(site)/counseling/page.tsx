import type { Metadata } from "next";
import { CalendarCheck, Check, ClipboardPen, Compass, FileText, Handshake, MessagesSquare, Phone, Route, UsersRound } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { CounselingForm } from "@/components/counseling/CounselingForm";
import "./counseling.css";

export const metadata: Metadata = {
  title: "Free career counseling for IT freshers",
  description: "Unsure how to start your IT career? Talk through your role options, resume and job search in a free 1:1 call with a Klymb mentor.",
};

/** What every call gives them. */
const outcomes = ["A clear role direction", "Your resume priorities", "Practical next steps"];

const steps = [
  { icon: ClipboardPen, title: "Request a call" },
  { icon: Phone, title: "We WhatsApp you" },
  { icon: MessagesSquare, title: "Your 1:1 call" },
];

const topics = [
  { icon: Compass, title: "Picking your line" },
  { icon: FileText, title: "Resume and profile" },
  { icon: Route, title: "Your next 90 days" },
  { icon: CalendarCheck, title: "Interviews" },
];

const perks = [
  { icon: Handshake, text: "Professionals from your line" },
  { icon: MessagesSquare, text: "Ask questions any time" },
  { icon: UsersRound, text: "Freshers on the same path" },
];

const faqs = [
  { q: "Who is it for?", a: "IT and CS freshers, and final-year students." },
  { q: "Is it really free?", a: "Yes. The call and the community are both free." },
  { q: "When is the call?", a: "In the evening, 5–9 PM IST. We WhatsApp you within 48 hours to fix the time." },
];

const eyebrow = "text-xs font-extrabold uppercase tracking-[0.16em]";

export default function CounselingPage() {
  return (
    <>
      <section className="cs-hero relative isolate overflow-clip bg-night text-white">
        <div aria-hidden="true" className="cs-grid" />
        <div aria-hidden="true" className="cs-glow" />
        <Container className="grid gap-10 pb-16 pt-10 sm:pt-16 lg:grid-cols-[1.1fr_1fr] lg:grid-rows-[auto_1fr] lg:gap-x-14 lg:gap-y-10 lg:pb-24">
          {/* Phones: intro, then the form, then the steps. Desktop: intro and steps on the left, the form on the right. */}
          <div className="cs-rise lg:self-end">
            <p className="inline-flex items-center gap-2 rounded-full bg-white/8 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-white/70 ring-1 ring-white/12">
              Recently graduated? It&apos;s free
            </p>
            <h1 className="display mt-5 text-[clamp(2.4rem,6.5vw,4.5rem)] leading-[0.98]">
              Unsure how to start <span className="text-red-soft">your IT career?</span>
            </h1>
            <p className="mt-5 max-w-md text-[17px] leading-relaxed text-white/75">
              Talk through your role options, resume, and job search in a free 1:1 call with a Klymb mentor.
            </p>
            <p className="mt-6 text-xs font-extrabold uppercase tracking-[0.16em] text-white/50">You leave with</p>
            <ul className="mt-2.5 grid max-w-md gap-2">
              {outcomes.map((o) => (
                <li key={o} className="flex items-center gap-2.5 font-semibold text-white/90">
                  <span aria-hidden="true" className="grid size-5 shrink-0 place-items-center rounded-full bg-red-soft/20 text-red-soft">
                    <Check className="size-3.5" strokeWidth={3} />
                  </span>
                  {o}
                </li>
              ))}
            </ul>
          </div>

          <div id="book" className="cs-rise scroll-mt-24 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-center" style={{ "--rise": "0.12s" } as React.CSSProperties}>
            <div className="cs-card relative rounded-slab bg-card p-6 text-ink shadow-float sm:p-8">
              <CounselingForm />
            </div>
          </div>

          <div className="cs-rise lg:self-start" style={{ "--rise": "0.24s" } as React.CSSProperties}>
            <ol className="grid max-w-lg grid-cols-3 gap-3">
              {steps.map((s, n) => (
                <li key={s.title} className="cs-step">
                  <span aria-hidden="true" className="flex items-center gap-1.5 text-red-soft">
                    <s.icon className="size-4" />
                    <span className="text-[11px] font-extrabold tracking-[0.14em]">STEP {n + 1}</span>
                  </span>
                  <h2 className="mt-1.5 font-heading text-[15px] font-bold leading-snug">{s.title}</h2>
                </li>
              ))}
            </ol>
          </div>
        </Container>
      </section>

      <Container className="py-14 sm:py-20">
        <h2 className="display text-center text-[clamp(1.8rem,5vw,2.75rem)]">What we&apos;ll talk about.</h2>
        <ul className="mx-auto mt-8 grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4">
          {topics.map((t) => (
            <li key={t.title} className="cs-topic group flex flex-col items-center gap-3 rounded-card bg-card px-3 py-5 text-center">
              <span aria-hidden="true" className="grid size-11 place-items-center rounded-xl bg-red-tint text-red-strong">
                <t.icon className="size-5 transition-transform duration-300 group-hover:scale-110" />
              </span>
              <span className="font-heading font-bold leading-snug">{t.title}</span>
            </li>
          ))}
        </ul>
      </Container>

      <section className="bg-red-muted text-white">
        <Container className="py-14 sm:py-16">
          <p className={`${eyebrow} flex items-center justify-center gap-2 text-white/60`}>
            <UsersRound aria-hidden="true" className="size-4" /> Free community
          </p>
          <h2 className="display mt-3 text-center text-[clamp(1.8rem,5vw,2.75rem)] leading-[1.05]">You won&apos;t figure it out alone.</h2>
          <ul className="mx-auto mt-8 grid max-w-3xl gap-3 sm:grid-cols-3">
            {perks.map((p) => (
              <li key={p.text} className="flex items-center gap-3 rounded-card bg-white/8 p-4 ring-1 ring-white/12">
                <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/10 text-red-soft">
                  <p.icon className="size-5" />
                </span>
                <span className="font-semibold">{p.text}</span>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      <Container className="py-14 sm:py-20">
        <h2 className="display text-center text-[clamp(1.8rem,5vw,2.75rem)]">Questions.</h2>
        <div className="mx-auto mt-8 max-w-2xl divide-y divide-line/25 rounded-card bg-card">
          {faqs.map((f) => (
            <details key={f.q} className="cs-faq group px-6 py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-heading text-lg font-bold">
                {f.q}
                <span aria-hidden="true" className="text-2xl leading-none text-muted transition-transform duration-200 group-open:rotate-45">+</span>
              </summary>
              <p className="mt-2 text-[15px] text-muted">{f.a}</p>
            </details>
          ))}
        </div>
        <p className="mt-10 text-center">
          <a href="#book" className="inline-flex items-center gap-2 rounded-xl bg-red-strong px-6 py-3.5 font-bold text-white transition-colors hover:bg-red-press">
            Request my free call
          </a>
        </p>
      </Container>
    </>
  );
}
