import type { Metadata } from "next";
import { CalendarCheck, ClipboardPen, Compass, FileText, Handshake, MessagesSquare, Phone, Route, UsersRound } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { CounselingForm } from "@/components/counseling/CounselingForm";
import "./counseling.css";

export const metadata: Metadata = {
  title: "Free career counseling for IT freshers",
  description: "Just passed out? Book a free one-on-one career counseling call with Klymb.ai and join our free community of IT professionals.",
};

/** What freshers usually come with. Shown as chips in the hero. */
const asks = ["Which role suits me?", "No callbacks yet", "Fixing my resume", "Off-campus jobs", "DSA or projects?", "Service or product company?"];

const steps = [
  { icon: ClipboardPen, title: "Fill the form", line: "Two minutes. Tell us where you're stuck." },
  { icon: Phone, title: "We WhatsApp you", line: "To fix a time that works for you." },
  { icon: MessagesSquare, title: "Your one-on-one", line: "Ask anything about your career." },
];

const topics = [
  { icon: Compass, title: "Picking your line", line: "Developer, data, testing, cloud, AI: what each job is really like, and which fits you." },
  { icon: FileText, title: "Resume and profile", line: "What recruiters look for in a fresher, and what to cut." },
  { icon: Route, title: "A plan for the next 90 days", line: "What to learn, what to build, and where to apply." },
  { icon: CalendarCheck, title: "Interviews", line: "How fresher rounds work and how to prepare for them." },
];

const faqs = [
  { q: "Who is this for?", a: "IT and computer science freshers who have just graduated or are in their final year, and anyone starting out in tech who isn't sure what to do next." },
  { q: "Is it really free?", a: "Yes. The one-on-one call and the community are both free. You don't have to buy anything." },
  { q: "How will the call happen?", a: "After you fill the form, our team WhatsApps you to fix a time. The call is one-on-one, just you and a counselor." },
  { q: "What is the community?", a: "A free group where you meet other freshers and working professionals from your line, ask questions and hear about openings." },
];

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
              Free for IT freshers
            </p>
            <h1 className="display mt-5 text-[clamp(2.4rem,6.5vw,4.5rem)] leading-[0.98]">
              Just passed out?<br />
              <span className="text-red-soft">Talk it through, free.</span>
            </h1>
            <p className="mt-5 max-w-lg text-[17px] leading-relaxed text-white/75">
              A one-on-one career counseling call for IT freshers. Bring your questions about roles, jobs, your resume or what to learn next. Then join our free community of professionals in your line.
            </p>
            <ul className="mt-6 flex max-w-lg flex-wrap gap-2" aria-label="Things freshers ask us">
              {asks.map((a) => (
                <li key={a} className="rounded-full bg-white/8 px-3 py-1.5 text-sm font-semibold text-white/85 ring-1 ring-white/12">{a}</li>
              ))}
            </ul>
          </div>

          <div id="book" className="cs-rise scroll-mt-24 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-center" style={{ "--rise": "0.12s" } as React.CSSProperties}>
            <div className="cs-card relative rounded-slab bg-card p-6 text-ink shadow-float sm:p-8">
              <CounselingForm />
            </div>
          </div>

          <div className="cs-rise lg:self-start" style={{ "--rise": "0.24s" } as React.CSSProperties}>
            <ol className="grid max-w-lg gap-4 sm:grid-cols-3">
              {steps.map((s, n) => (
                <li key={s.title} className="cs-step">
                  <span aria-hidden="true" className="flex items-center gap-2 text-red-soft">
                    <s.icon className="size-5" />
                    <span className="text-xs font-extrabold tracking-[0.14em]">STEP {n + 1}</span>
                  </span>
                  <h2 className="mt-2 font-heading text-base font-bold">{s.title}</h2>
                  <p className="mt-0.5 text-sm text-white/60">{s.line}</p>
                </li>
              ))}
            </ol>
          </div>
        </Container>
      </section>

      <Container className="py-16 sm:py-24">
        <h2 className="display text-center text-[clamp(2rem,5vw,3.25rem)]">What we&apos;ll talk about.</h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-muted">Whatever is on your mind. These are the four things freshers ask about most.</p>
        <div className="mt-12 grid gap-4 sm:grid-cols-2">
          {topics.map((t) => (
            <section key={t.title} className="cs-topic group flex gap-4 rounded-card bg-card p-6">
              <span aria-hidden="true" className="grid size-11 shrink-0 place-items-center rounded-xl bg-red-tint text-red-strong">
                <t.icon className="size-5 transition-transform duration-300 group-hover:scale-110" />
              </span>
              <div>
                <h3 className="font-heading text-lg font-bold">{t.title}</h3>
                <p className="mt-1 text-[15px] text-muted">{t.line}</p>
              </div>
            </section>
          ))}
        </div>
      </Container>

      <section className="bg-red-muted text-white">
        <Container className="grid items-center gap-10 py-16 sm:py-20 lg:grid-cols-[1fr_1fr]">
          <div>
            <p className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.16em] text-white/60">
              <UsersRound aria-hidden="true" className="size-4" /> The free community
            </p>
            <h2 className="display mt-3 text-[clamp(2rem,5vw,3rem)] leading-[1.02]">You won&apos;t figure it out alone.</h2>
            <p className="mt-4 max-w-lg text-[17px] leading-relaxed text-white/80">
              Everyone who books a call joins our free community. You&apos;ll be connected with professionals working in the line you want, plus other freshers on the same path.
            </p>
          </div>
          <ul className="grid gap-3">
            {[
              { icon: Handshake, text: "Meet professionals from your career line" },
              { icon: MessagesSquare, text: "Ask questions any time, get real answers" },
              { icon: UsersRound, text: "Learn alongside freshers on the same path" },
            ].map((p) => (
              <li key={p.text} className="flex items-center gap-4 rounded-card bg-white/8 p-4 ring-1 ring-white/12">
                <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/10 text-red-soft">
                  <p.icon className="size-5" />
                </span>
                <span className="font-semibold">{p.text}</span>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      <Container className="py-16 sm:py-24">
        <h2 className="display text-center text-[clamp(2rem,5vw,3rem)]">Questions.</h2>
        <div className="mx-auto mt-10 max-w-2xl divide-y divide-line/25 rounded-card bg-card">
          {faqs.map((f) => (
            <details key={f.q} className="cs-faq group px-6 py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-heading text-lg font-bold">
                {f.q}
                <span aria-hidden="true" className="text-2xl leading-none text-muted transition-transform duration-200 group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 text-[15px] leading-relaxed text-muted">{f.a}</p>
            </details>
          ))}
        </div>
        <p className="mt-10 text-center">
          <a href="#book" className="inline-flex items-center gap-2 rounded-xl bg-red-strong px-6 py-3.5 font-bold text-white transition-colors hover:bg-red-press">
            Book my free session
          </a>
        </p>
      </Container>
    </>
  );
}
