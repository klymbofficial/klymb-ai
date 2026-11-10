import Image from "next/image";
import Link from "next/link";
import { entity } from "@/data/legal";
import { formatINR } from "@/lib/format";
import { SD_OFFER, SD_STATS, type SdOfferState, type SdRole } from "@/lib/sd-offer";
import { ClaimCard } from "./ClaimCard";
import { IntroVideo } from "./IntroVideo";
import { OfferBackdrop } from "./OfferBackdrop";
import { OpenInBrowser } from "./OpenInBrowser";
import { OfferProof } from "./OfferProof";
import { RememberReferral } from "./RememberReferral";

/**
 * The System Design offer: the pitch, the intro video and what the fee buys on
 * the left, the price and the claim form on the right. On a phone the form
 * comes last, so the top bar keeps the price and a way to it in reach.
 */
export function OfferView({ offer, email, name, phone, linkedin, role, campaign, referral, resume, signInFailed, inApp }: {
  offer: SdOfferState; email: string | null; name: string; phone: string; linkedin: string; role: SdRole | ""; campaign: string | null;
  referral: { code: string; invitedBy: string } | null; resume: boolean; signInFailed: boolean; inApp: boolean;
}) {
  return (
    <OfferBackdrop>
      <RememberReferral live={referral?.code ?? null} />
      <main className="relative mx-auto box-border grid min-h-dvh w-full max-w-[1240px] grid-cols-[minmax(0,1fr)] items-center gap-[26px] px-[18px] pt-0 pb-7 lg:grid-cols-[minmax(0,1.3fr)_minmax(380px,.8fr)] lg:items-start lg:gap-12 lg:px-10 lg:py-16">
        {inApp && !email && <OpenInBrowser campaign={campaign} />}
        <div className="sd-offer-left flex flex-col gap-4 lg:gap-6">
          <div className="sticky top-0 z-20 -mx-[18px] flex items-center justify-between gap-3 bg-[rgba(26,23,22,.88)] px-[18px] py-2.5 backdrop-blur-md lg:static lg:mx-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
            <Link href="/" aria-label="Klymb.ai home" className="inline-flex py-2">
              <Image src="/brand/klymb-logo.svg" alt="" width={104} height={16} priority className="h-4 w-auto [filter:brightness(0)_invert(1)_sepia(.2)]" />
            </Link>
            <a href="#claim" className="flex min-h-11 items-center rounded-[10px] bg-[#83050b] px-3.5 text-sm font-extrabold whitespace-nowrap text-[#fbf6ee] no-underline shadow-[0_6px_18px_rgba(0,0,0,.35)] lg:hidden">Get it for {formatINR(offer.price)}</a>
          </div>
          <h1 className="m-0 mt-2 text-[44px] leading-[.9] font-extrabold tracking-[-.055em] text-balance text-[#fbf6ee] lg:text-[clamp(48px,5.6cqw,80px)]">System design, <span className="text-[#f0868b]">phone pe.</span></h1>
          <p className="m-0 max-w-[32rem] text-[15px] leading-[1.45] text-pretty text-[#d9cfc2] lg:text-lg">21 days, 15 minutes a day. Go from “what is system design?” to designing a chat app, a ticket booking system and an AI assistant in an interview.</p>
          <p className="m-0 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-bold text-[#f3d48a]">
            <span>Finish on schedule and get 100% back.</span>
            {offer.open && <span className="text-[#d9cfc2]">{formatINR(offer.price)} until {SD_OFFER.endsLabel}.</span>}
          </p>
          <IntroVideo />
          <dl className="m-0 hidden grid-cols-3 gap-4 border-t border-[rgba(246,239,228,.18)] pt-[18px] lg:grid">
            {SD_STATS.map(([value, label]) => (
              <div key={label} className="flex flex-col gap-0.5">
                <dd className="order-1 m-0 text-[30px] leading-none font-extrabold tracking-[-.03em] text-[#fbf6ee]">{value}</dd>
                <dt className="order-2 text-[13px] text-[#b9ad9f]">{label}</dt>
              </div>
            ))}
          </dl>
          <OfferProof />
        </div>

        <div id="claim" className="sd-offer-right flex scroll-mt-4 flex-col gap-4">
          <ClaimCard key={referral?.code} offer={offer} email={email} name={name} phone={phone} linkedin={linkedin} role={role} campaign={campaign} referral={referral} resume={resume} signInFailed={signInFailed} inApp={inApp} />
          <p className="m-0 text-xs leading-[1.4] text-[#b9ad9f]">
            Sold by {entity.registeredName} ·{" "}
            <Link href="/terms" className="underline underline-offset-2">Terms</Link> ·{" "}
            <Link href="/refund-policy" className="underline underline-offset-2">Refund policy</Link> ·{" "}
            <Link href="/privacy" className="underline underline-offset-2">Privacy</Link>
          </p>
        </div>
      </main>
    </OfferBackdrop>
  );
}
