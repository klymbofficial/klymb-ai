import Image from "next/image";
import Link from "next/link";
import { entity } from "@/data/legal";
import { SD_STATS, type SdOfferState, type SdRole } from "@/lib/sd-offer";
import { ClaimCard } from "./ClaimCard";
import { IntroVideo } from "./IntroVideo";
import { OfferBackdrop } from "./OfferBackdrop";
import { RememberReferral } from "./RememberReferral";

/** The System Design offer: the intro video then the pitch on the left, the price and the claim form on the right. */
export function OfferView({ offer, email, name, phone, linkedin, role, campaign, referral, resume, signInFailed, inApp }: {
  offer: SdOfferState; email: string | null; name: string; phone: string; linkedin: string; role: SdRole | ""; campaign: string | null;
  referral: { code: string; invitedBy: string } | null; resume: boolean; signInFailed: boolean; inApp: boolean;
}) {
  return (
    <OfferBackdrop>
      <RememberReferral live={referral?.code ?? null} />
      <main className="relative mx-auto box-border grid min-h-dvh w-full max-w-[1240px] grid-cols-[minmax(0,1fr)] items-center gap-[26px] px-[18px] pt-11 pb-7 lg:grid-cols-[minmax(0,1.3fr)_minmax(380px,.8fr)] lg:items-start lg:gap-12 lg:px-10 lg:py-16">
        {/* The form runs longer than this column, so the video and the pitch stay in view beside it. */}
        <div className="sd-offer-left flex flex-col gap-4 lg:sticky lg:top-16 lg:gap-6">
          <Link href="/" aria-label="Klymb.ai home" className="inline-flex self-start py-2">
            <Image src="/brand/klymb-logo.svg" alt="" width={104} height={16} priority className="h-4 w-auto [filter:brightness(0)_invert(1)_sepia(.2)]" />
          </Link>
          <IntroVideo />
          <h1 className="m-0 mt-2 text-[44px] leading-[.9] font-extrabold tracking-[-.055em] text-balance text-[#fbf6ee] lg:text-[clamp(48px,5.6cqw,80px)]">System design, <span className="text-[#f0868b]">phone pe.</span></h1>
          <p className="m-0 max-w-[30rem] text-[15px] leading-[1.45] text-pretty text-[#d9cfc2] lg:text-lg">System design, explained with real examples.<br />Built for interviews.</p>
          <dl className="m-0 hidden grid-cols-3 gap-4 border-t border-[rgba(246,239,228,.18)] pt-[18px] lg:grid">
            {SD_STATS.map(([value, label]) => (
              <div key={label} className="flex flex-col gap-0.5">
                <dd className="order-1 m-0 text-[30px] leading-none font-extrabold tracking-[-.03em] text-[#fbf6ee]">{value}</dd>
                <dt className="order-2 text-[13px] text-[#b9ad9f]">{label}</dt>
              </div>
            ))}
          </dl>
        </div>

        <div className="sd-offer-right flex flex-col gap-4">
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
