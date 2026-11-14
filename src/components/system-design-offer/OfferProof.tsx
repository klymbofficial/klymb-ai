import Link from "next/link";
import { MODULES } from "@/data/system-design/course-app";
import { SD_REFERRAL } from "@/lib/sd-offer";
import { FINAL_MARK } from "@/lib/sd-pace";

const kicker = "m-0 text-[11px] font-extrabold tracking-[.12em] text-[#f3d48a] uppercase";
const heading = "m-0 text-[26px] leading-[1.05] font-extrabold tracking-[-.03em] text-balance text-[#fbf6ee] lg:text-[34px]";
const card = "rounded-2xl border border-[rgba(246,239,228,.16)] bg-[rgba(246,239,228,.05)]";

/** Every way the fee comes back. The words follow the refund policy, which is what binds. */
const WAYS_BACK = [
  { tag: "Finish it", title: "Finish on schedule, get 100% back", body: `One lesson a day for 21 days, no missed days, and ${FINAL_MARK}% or higher on the final assessment.` },
  { tag: "Or share it", title: `${SD_REFERRAL.friends} friends buy, get 100% back`, body: `${SD_REFERRAL.friends} friends buy with your link within ${SD_REFERRAL.days} days of your purchase. You keep the course.` },
] as const;

const DAY_STEPS = [
  ["Watch", "One 5 to 7 minute video in Hinglish."],
  ["Pass", "Five questions on what you watched. Three right and the day is done."],
  ["Practise", "Estimate the numbers, build the diagram and answer the follow-ups an interviewer asks."],
  ["Keep", "A one-page cheatsheet for every day, to revise before an interview."],
] as const;

const QUESTIONS = [
  ["I’m a beginner. Is this for me?", "Yes. Day 1 starts from “What is system design?” and each day builds on the one before."],
  ["Do I need a laptop?", "No. Every lesson, question and diagram works on your phone."],
  ["When does it start?", "The day you choose. The daily schedule begins once you pass Day 1."],
  ["What if I miss a day?", "You keep the course and carry on learning. Only the refund for finishing on schedule is gone."],
] as const;

/** What the fee buys, for someone who hasn't decided: how it comes back, a day, the 21 days, and the usual questions. */
/** The day number each module starts on. */
const FIRST_DAY = MODULES.map((_, mi) => MODULES.slice(0, mi).reduce((n, m) => n + m.lessons.length, 1));

export function OfferProof() {
  return (
    <div className="flex flex-col gap-9 lg:gap-12">
      <section aria-labelledby="sd-back" className="flex flex-col gap-3.5">
        <p className={kicker}>Two ways to pay nothing</p>
        <h2 id="sd-back" className={heading}>Your fee can come back in full.</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {WAYS_BACK.map((w) => (
            <div key={w.tag} className={`${card} flex flex-col gap-1.5 p-4`}>
              <span className="self-start rounded-md bg-[#e7c97a] px-2 py-1 text-[11px] leading-none font-extrabold tracking-[.06em] text-[#2a1d05] uppercase">{w.tag}</span>
              <h3 className="m-0 mt-1 text-lg leading-[1.15] font-extrabold text-[#fbf6ee]">{w.title}</h3>
              <p className="m-0 text-sm leading-[1.45] text-pretty text-[#d9cfc2]">{w.body}</p>
            </div>
          ))}
        </div>
        <p className="m-0 text-xs text-[#b9ad9f]">The fee is refunded once. <Link href="/refund-policy" className="underline underline-offset-2">Full refund terms</Link></p>
      </section>

      <section aria-labelledby="sd-day" className="flex flex-col gap-3.5">
        <p className={kicker}>15 minutes a day</p>
        <h2 id="sd-day" className={heading}>What one day looks like.</h2>
        <ol className="m-0 grid list-none gap-3 p-0 sm:grid-cols-2">
          {DAY_STEPS.map(([title, body], i) => (
            <li key={title} className={`${card} flex gap-3 p-4`}>
              <span aria-hidden="true" className="flex size-7 flex-none items-center justify-center rounded-full bg-[#83050b] text-[13px] font-extrabold text-[#fbf6ee]">{i + 1}</span>
              <span className="flex flex-col gap-1">
                <span className="text-base leading-[1.2] font-extrabold text-[#fbf6ee]">{title}</span>
                <span className="text-sm leading-[1.45] text-pretty text-[#d9cfc2]">{body}</span>
              </span>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="sd-days" className="flex flex-col gap-3.5">
        <p className={kicker}>The full course</p>
        <h2 id="sd-days" className={heading}>21 days, from basics to AI systems.</h2>
        <div className="flex flex-col gap-2.5">
          {MODULES.map((m, mi) => (
            <details key={m.title} open={mi === 0} className={`${card} group`}>
              <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-base font-extrabold text-[#fbf6ee] [&::-webkit-details-marker]:hidden">
                {m.title}
                <span aria-hidden="true" className="text-xl leading-none text-[#f3d48a] transition-transform duration-200 group-open:rotate-45">+</span>
              </summary>
              <ol className="m-0 flex list-none flex-col border-t border-[rgba(246,239,228,.12)] p-0 px-4 py-2">
                {m.lessons.map(([title, length], li) => {
                  const day = FIRST_DAY[mi] + li;
                  return (
                    <li key={title} className="flex items-baseline gap-3 py-1.5 text-sm leading-[1.35] text-[#e9e0d3]">
                      <span className="w-[46px] flex-none text-xs font-bold text-[#b9ad9f] tabular-nums">Day {day}</span>
                      <span className="min-w-0 flex-1 text-pretty">{title}</span>
                      <span className="flex-none text-xs text-[#b9ad9f] tabular-nums">{length}</span>
                    </li>
                  );
                })}
              </ol>
            </details>
          ))}
        </div>
        <p className="m-0 text-sm leading-[1.45] text-pretty text-[#d9cfc2]">It ends with a final assessment on the whole course.</p>
      </section>

      <section aria-labelledby="sd-faq" className="flex flex-col gap-3.5">
        <h2 id="sd-faq" className={heading}>Before you buy.</h2>
        <dl className="m-0 flex flex-col gap-2.5">
          {QUESTIONS.map(([q, a]) => (
            <div key={q} className={`${card} flex flex-col gap-1 p-4`}>
              <dt className="text-base leading-[1.25] font-extrabold text-[#fbf6ee]">{q}</dt>
              <dd className="m-0 text-sm leading-[1.45] text-pretty text-[#d9cfc2]">{a}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
