import { CalendarDays, Clock, Mic, Video } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { OfferBackdrop } from "@/components/system-design-offer/OfferBackdrop";
import { WEBINAR } from "@/lib/webinar";
import { WebinarCard } from "./WebinarCard";

const FACTS = [
  { Icon: CalendarDays, text: WEBINAR.dateLabel },
  { Icon: Clock, text: WEBINAR.timeLabel },
  { Icon: Video, text: "Live on Google Meet" },
  { Icon: Mic, text: `By the ${WEBINAR.speaker}` },
] as const;

/**
 * The webinar page, in the System Design offer's look: the pitch, the facts
 * and the agenda on the left, the sign-up card on the right. On a phone the
 * card comes right after the headline and the agenda follows it.
 */
export function WebinarView({ open, serverNow }: { open: boolean; serverNow: number }) {
  return (
    <OfferBackdrop>
      <main className="relative mx-auto box-border grid min-h-dvh w-full max-w-[1240px] grid-cols-[minmax(0,1fr)] gap-5 px-[18px] pt-0 pb-10 lg:grid-cols-[minmax(0,1.3fr)_minmax(380px,.8fr)] lg:items-start lg:gap-12 lg:px-10 lg:py-16">
        <div className="sd-offer-left contents lg:flex lg:flex-col lg:gap-6">
          <div className="sticky top-0 z-20 -mx-[18px] flex items-center justify-between gap-3 bg-[rgba(26,23,22,.88)] px-[18px] py-2.5 backdrop-blur-md lg:static lg:mx-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
            <Link href="/" aria-label="Klymb.ai home" className="inline-flex py-2">
              <Image src="/brand/klymb-logo.svg" alt="" width={104} height={16} priority className="h-4 w-auto [filter:brightness(0)_invert(1)_sepia(.2)]" />
            </Link>
            {open && <a href="#register" className="flex min-h-11 items-center rounded-[10px] bg-[#83050b] px-3.5 text-sm font-extrabold whitespace-nowrap text-[#fbf6ee] no-underline shadow-[0_6px_18px_rgba(0,0,0,.35)] lg:hidden">Save my seat</a>}
          </div>

          <div className="flex flex-col gap-4">
            <span className="w-fit rounded-full border border-[rgba(231,201,122,.4)] bg-black/25 px-3 py-1 text-xs font-extrabold tracking-[.12em] text-[#f3d48a] uppercase">Free live webinar · 1 hour</span>
            <h1 className="m-0 text-[42px] leading-[.95] font-extrabold tracking-[-.05em] text-balance text-[#fbf6ee] lg:text-[clamp(48px,5.4cqw,76px)]">AI tools and <span className="text-[#f0868b]">Claude</span>, live.</h1>
            <p className="m-0 max-w-[34rem] text-[15px] leading-[1.5] text-pretty text-[#d9cfc2] lg:text-lg">One hour on getting real work out of AI: how Claude thinks, prompts that work the first time, Claude Code building something live, and the tools worth keeping open while you study or work.</p>
            <ul className="m-0 grid list-none grid-cols-2 gap-2 p-0 sm:max-w-[34rem]">
              {FACTS.map(({ Icon, text }) => (
                <li key={text} className="flex items-center gap-2 rounded-[10px] border border-[rgba(246,239,228,.14)] bg-black/20 px-3 py-2.5 text-[13px] leading-[1.3] font-bold text-[#f6efe4] lg:text-sm">
                  <Icon size={16} aria-hidden="true" className="flex-none text-[#e7c97a]" />
                  {text}
                </li>
              ))}
            </ul>
          </div>

          <section aria-labelledby="agenda" className="flex flex-col gap-3 max-lg:order-2 max-lg:mt-4">
            <h2 id="agenda" className="m-0 text-xs font-extrabold tracking-[.14em] text-[#e7c97a] uppercase">What we&apos;ll cover</h2>
            <ol className="m-0 flex list-none flex-col gap-0 border-t border-[rgba(246,239,228,.14)] p-0">
              {WEBINAR.agenda.map(([head, body], i) => (
                <li key={head} className="flex gap-4 border-b border-[rgba(246,239,228,.14)] py-4">
                  <span className="w-7 flex-none text-[22px] leading-none font-extrabold text-[#f0868b] tabular-nums">{String(i + 1).padStart(2, "0")}</span>
                  <span className="flex flex-col gap-1">
                    <span className="text-[17px] leading-[1.2] font-extrabold text-[#fbf6ee]">{head}</span>
                    <span className="text-sm leading-[1.45] text-[#b9ad9f]">{body}</span>
                  </span>
                </li>
              ))}
            </ol>
            <p className="m-0 text-sm leading-[1.5] text-[#b9ad9f]">For students and working professionals. No coding background needed; bring a laptop if you want to follow along.</p>
          </section>
        </div>

        <div id="register" className="sd-offer-right flex scroll-mt-20 flex-col gap-4 max-lg:order-1">
          <WebinarCard open={open} serverNow={serverNow} />
          <p className="m-0 text-xs leading-[1.4] text-[#b9ad9f]">
            By registering you agree to hear from Klymb.ai about this webinar ·{" "}
            <Link href="/terms" className="underline underline-offset-2">Terms</Link> ·{" "}
            <Link href="/privacy" className="underline underline-offset-2">Privacy</Link>
          </p>
        </div>
      </main>
    </OfferBackdrop>
  );
}
