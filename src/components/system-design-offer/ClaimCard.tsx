"use client";

import clsx from "clsx";
import { ArrowRight, Briefcase, ChevronDown, GraduationCap } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { courseSignIn } from "@/app/(course)/learn/system-design/actions";
import { offerSignIn, offerSwitchAccount } from "@/app/(course)/system-design/actions";
import { FINAL_MARK } from "@/lib/sd-pace";
import { formatMoney, priceIn, type Market } from "@/lib/pricing";
import { loadCheckout, type RazorpaySuccess } from "@/lib/razorpay-checkout";
import { trackOffer, type OfferStep } from "@/lib/sd-offer-track";
import { keptIntern } from "./RememberIntern";
import { metaTrack } from "@/lib/meta-pixel";
import { openInBrowser } from "./OpenInBrowser";
import { couponCodeProblem, withCoupon } from "@/lib/sd-coupons";
import { DIAL_CODES, INDIA_DIAL, SD_OFFER, claimProblems, phoneProblem, splitPhone, countdownParts, linkedInProblem, offPercent, referralCodeProblem, type SdOfferState, type SdRole } from "@/lib/sd-offer";

const pad = (n: number) => String(n).padStart(2, "0");

const ROLES: { key: SdRole; label: string; Icon: typeof Briefcase }[] = [
  { key: "student", label: "Student", Icon: GraduationCap },
  { key: "working", label: "Working professional", Icon: Briefcase },
];

interface Claim { name: string; dial?: string; phone: string; linkedin: string; role: SdRole | ""; ref: string; coupon?: string }

/** The form, kept for the trip to Google and back: this tab only, and gone once read. */
const DRAFT = "klymb.sd-claim";

function keepDraft(claim: Claim) {
  try { window.sessionStorage.setItem(DRAFT, JSON.stringify(claim)); } catch { /* private mode: they retype it */ }
}

function takeDraft() {
  try {
    const raw = window.sessionStorage.getItem(DRAFT);
    window.sessionStorage.removeItem(DRAFT);
    return raw ? (JSON.parse(raw) as Claim) : null;
  } catch {
    return null;
  }
}

/**
 * Runs from the server's own clock, so the first paint matches the page it
 * came with. When it reaches zero the page is asked for again, at the new price.
 */
function Countdown({ endsAt, serverNow, onEnd }: { endsAt: number; serverNow: number; onEnd: () => void }) {
  const [now, setNow] = useState(serverNow);
  useEffect(() => {
    const iv = window.setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (t >= endsAt) { window.clearInterval(iv); onEnd(); }
    }, 1000);
    return () => window.clearInterval(iv);
  }, [endsAt, onEnd]);

  const { days, hours, minutes, seconds } = countdownParts(endsAt - now);
  const cells: [number, string][] = [[days, "days"], [hours, "hrs"], [minutes, "min"], [seconds, "sec"]];
  return (
    <div role="timer" aria-label={`Offer ends in ${days} days ${hours} hours`} className="flex gap-1.5">
      {cells.map(([value, label]) => (
        <div key={label} className="flex min-w-[46px] flex-col items-center rounded-lg border border-[rgba(231,201,122,.3)] bg-black/30 px-1 py-1.5">
          <span className="text-lg leading-none font-extrabold tabular-nums">{pad(value)}</span>
          <span className="text-[10px] font-bold tracking-[.08em] text-[#e7c97a] uppercase">{label}</span>
        </div>
      ))}
    </div>
  );
}

/**
 * The price, the countdown and the form. Claiming signed out goes to Google
 * first, for the email, and comes back here with the form as they left it.
 * Signed in, it saves their answers and opens Razorpay.
 */
export function ClaimCard({ offer, email, name: startName, phone: startPhone, linkedin: startLinkedin, role: startRole, campaign, referral, coupon: startCoupon, market, resume, signInFailed, inApp }: {
  offer: SdOfferState; email: string | null; name: string; phone: string; linkedin: string; role: SdRole | ""; campaign: string | null;
  referral: { code: string; invitedBy: string } | null; coupon: { code: string; price: number | null } | null; market: Market; resume: boolean; signInFailed: boolean; inApp: boolean;
}) {
  const router = useRouter();
  const signIn = useRef<HTMLFormElement>(null);
  const restored = useRef(false);
  const [name, setName] = useState(startName);
  // A saved number comes back split: the country picker and the rest.
  const [dial, setDial] = useState(() => splitPhone(startPhone).dial);
  const [phone, setPhone] = useState(() => splitPhone(startPhone).number);
  const [linkedin, setLinkedin] = useState(startLinkedin);
  const [role, setRole] = useState<SdRole | "">(startRole);
  const [ref, setRef] = useState(referral?.code ?? "");
  const [coupon, setCoupon] = useState(startCoupon?.code ?? "");
  const [applied, setApplied] = useState<{ code: string; price: number } | null>(startCoupon?.price != null ? { code: startCoupon.code, price: startCoupon.price } : null);
  const [couponError, setCouponError] = useState(startCoupon && startCoupon.price == null ? "That coupon code isn't active right now." : "");
  const [checking, setChecking] = useState(false);
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(signInFailed ? "Google sign-in did not complete. Please try again." : "");
  const [blocked, setBlocked] = useState(false);
  const [copied, setCopied] = useState(false);

  const missing = claimProblems({ name, dial, phone, role });
  const badName = tried && missing.includes("your name");
  const badPhone = tried && missing.includes(phoneProblem(dial));
  const india = dial === INDIA_DIAL;
  const badLinkedin = tried ? linkedInProblem(linkedin) : null;
  const badRef = tried ? referralCodeProblem(ref) : null;
  const badCoupon = (tried ? couponCodeProblem(coupon) : null) || couponError || null;
  // The price shown is the one the server will charge: the coupon's, never above today's, in their own currency.
  const price = priceIn(market, withCoupon(offer.price, applied));
  const full = priceIn(market, offer.full);
  const before = priceIn(market, offer.price);
  const discounted = price < full;
  // The offer only matters where it changes the price: the US pays $20 either way.
  const offerShown = offer.open && before < full;
  const money = (amount: number) => formatMoney(amount, market.currency);

  const fail = (message: string) => { setBusy(false); setError(message); };
  /** Asks the server what the code gives, so the price on the page changes before they pay. */
  async function applyCoupon() {
    const code = coupon.trim().toUpperCase();
    setCouponError("");
    if (!code) return;
    if (couponCodeProblem(code)) return setCouponError(couponCodeProblem(code)!);
    setChecking(true);
    const res = await fetch("/api/sd/coupon", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }) }).catch(() => null);
    const out = await res?.json().catch(() => null);
    setChecking(false);
    if (res?.ok && typeof out?.price === "number") { setApplied({ code, price: out.price }); trackOffer("coupon", { inApp, campaign, coupon: code, intern: keptIntern() }); }
    else setCouponError(out?.error ?? "We couldn't check that code. Check your connection and try again.");
  }
  const step = (s: OfferStep) => trackOffer(s, { inApp, campaign, coupon: applied?.code ?? startCoupon?.code ?? null, intern: keptIntern() });
  const [started, setStarted] = useState(false);
  const startForm = () => { if (!started) { setStarted(true); step("form_start"); } };

  async function pay(details: Claim) {
    setError("");
    setBusy(true);

    if (!(await loadCheckout()) || !window.Razorpay) return fail("Could not load the payment window. Check your connection and try again.");

    const res = await fetch("/api/sd/order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...details, campaign, intern: keptIntern(), country: market.country }),
    }).catch(() => null);
    const order = await res?.json().catch(() => null);
    if (order?.enrolled) return router.push("/learn/system-design");
    if (!res?.ok || !order?.order_id) step("order_failed");
    if (!res?.ok || !order?.order_id) return fail(order?.error ?? "Could not start the payment. Please try again.");

    const rzp = new window.Razorpay({
      key: order.key_id,
      order_id: order.order_id,
      amount: order.amount,
      currency: order.currency,
      name: "Klymb.ai",
      description: "System Design · full course",
      prefill: order.prefill,
      theme: { color: "#83050B" },
      handler: async (r: RazorpaySuccess) => {
        const v = await fetch("/api/verify-payment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(r),
        }).catch(() => null);
        const out = await v?.json().catch(() => null);
        if (v?.ok && out?.ok) step("paid");
        if (v?.ok && out?.ok) metaTrack("Purchase", { value: order.amount / 100, currency: order.currency ?? "INR", content_name: "System Design" });
        if (v?.ok && out?.ok) router.push("/learn/system-design?paid=1");
        else fail(out?.error ?? `We could not confirm the payment. Email us with payment ID ${r.razorpay_payment_id}.`);
      },
      modal: { ondismiss: () => { step("rzp_closed"); fail("Payment cancelled. You can try again any time."); } },
    });
    rzp.on("payment.failed", (r) => { step("rzp_failed"); fail(r.error?.description ?? "The payment failed. No money was taken; please try again."); });
    step("rzp_open");
    metaTrack("InitiateCheckout", { value: order.amount / 100, currency: order.currency ?? "INR", content_name: "System Design" });
    rzp.open();
  }

  /** Back from Google: the form as they left it, and on to payment with no second tap. */
  const restore = useEffectEvent(() => {
    step("view");
    const draft = takeDraft();
    if (!draft) return;
    setName(draft.name);
    setDial(draft.dial ?? INDIA_DIAL);
    setPhone(draft.phone);
    setLinkedin(draft.linkedin);
    setRole(draft.role);
    setRef(draft.ref);
    if (draft.coupon) setCoupon(draft.coupon);
    if (email && resume) void pay(draft);
  });

  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    restore();
  }, []);

  function claim(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (missing.length || linkedInProblem(linkedin) || referralCodeProblem(ref) || couponCodeProblem(coupon)) return setTried(true);
    step("claim");
    const details = { name, dial, phone, linkedin, role, ref, coupon };
    if (email) return void pay(details);
    // Google refuses to sign anyone in from an app's own browser, so don't send them to its error.
    if (inApp) { step("blocked"); return setBlocked(true); }
    step("google");
    keepDraft(details);
    setBusy(true);
    signIn.current?.requestSubmit();
  }

  const copyLink = () => { void navigator.clipboard?.writeText(window.location.href).then(() => setCopied(true)); };

  const input = "min-h-[50px] w-full rounded-[10px] border bg-[#eae9e9] px-2.5 py-1.5 text-base text-ink caret-[#83050b] outline-none focus-visible:border-[#83050b]";
  const label = "text-[13px] font-bold";

  return (
    <div className="relative">
      <div aria-hidden="true" className="absolute -inset-px rounded-[22px] bg-[linear-gradient(140deg,#e7c97a,rgba(231,201,122,.1)_40%,#83050b_100%)] opacity-90" />
      <div className="relative overflow-hidden rounded-[20px] bg-[#f6efe4] text-ink shadow-[0_30px_80px_-20px_rgba(0,0,0,.6),0_0_0_1px_rgba(0,0,0,.05)]">
        <div className="relative overflow-hidden bg-[#83050b] p-[18px] text-[#fbf6ee] lg:px-6 lg:py-[22px]">
          <div aria-hidden="true" className="absolute -top-10 -right-10 size-[180px] rounded-full bg-[radial-gradient(circle,rgba(231,201,122,.55),transparent_65%)]" />
          <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,#e7c97a_1.2px,transparent_1.6px)] [background-size:16px_16px] opacity-[.18]" />
          <div className="relative flex flex-wrap items-end justify-between gap-3">
            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-extrabold tracking-[.12em] text-[#f3d48a] uppercase">{applied && price < before ? "With your coupon · full course" : discounted && !offer.open ? "Your locked price · full course" : "Full course"}</span>
              <div className="flex items-baseline gap-3">
                <span className="text-[52px] leading-[.9] font-extrabold tracking-[-.05em] lg:text-[64px]">{money(price)}</span>
                {discounted && <span className="text-xl font-bold text-[rgba(251,246,238,.7)] line-through decoration-[#f0868b] decoration-2">{money(full)}</span>}
              </div>
            </div>
            {discounted && <span className="sd-offer-pop rounded-[10px] bg-[#e7c97a] px-3 py-2 text-[15px] leading-none font-extrabold text-[#2a1d05] shadow-[0_6px_18px_rgba(0,0,0,.25)]">{offPercent(price, full)}% off</span>}
          </div>
          {offerShown && (
            <div className="relative mt-4 flex flex-wrap items-center gap-2.5">
              <span className="text-xs font-bold text-[#f3d48a]">Offer ends {SD_OFFER.endsLabel}, in</span>
              <Countdown endsAt={offer.endsAt} serverNow={offer.now} onEnd={router.refresh} />
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3.5 p-[18px] lg:p-6 lg:pb-[22px]">
          {referral && <p className="m-0 rounded-[10px] bg-[rgba(131,5,11,.08)] px-3 py-2.5 text-sm font-bold text-[#83050b]">{referral.invitedBy} invited you.</p>}
          <form onSubmit={claim} onChange={startForm} noValidate className="flex flex-col gap-3.5">
            <label className="flex min-w-0 flex-col gap-1.5">
              <span className={label}>Full name</span>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Aarav Sharma" autoComplete="name" maxLength={120} aria-invalid={badName} className={clsx(input, badName ? "border-[#83050b]" : "border-transparent")} />
            </label>
            <div className="flex min-w-0 flex-col gap-1.5">
              <label htmlFor="sd-phone" className={label}>Phone</label>
              <div className="flex gap-2">
                {/* The list names each country; the closed box shows just the flag and code, so it stays narrow. */}
                <div className="relative w-[96px] flex-none">
                  <select
                    value={dial}
                    onChange={(e) => setDial(e.target.value)}
                    aria-label="Country code"
                    autoComplete="tel-country-code"
                    className={clsx(input, "cursor-pointer appearance-none border-transparent text-transparent")}
                  >
                    {DIAL_CODES.map((c) => (
                      <option key={c.dial} value={c.dial} className="text-ink">{`${c.flag} ${c.name} (+${c.dial})`}</option>
                    ))}
                  </select>
                  <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-2.5 flex items-center gap-1 font-bold text-[#605d5d]">
                    {DIAL_CODES.find((c) => c.dial === dial)?.flag} +{dial}
                    <ChevronDown size={14} />
                  </span>
                </div>
                <input id="sd-phone" type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={india ? "98765 43210" : "Phone number"} autoComplete="tel-national" maxLength={20} aria-invalid={badPhone} className={clsx(input, "min-w-0", badPhone ? "border-[#83050b]" : "border-transparent")} />
              </div>
              {!india && <span className="text-xs leading-[1.4] text-[#605d5d]">Charged in Indian rupees (INR); your card&apos;s bank converts it.</span>}
            </div>
            <label className="flex min-w-0 flex-col gap-1.5">
              <span className={label}>LinkedIn profile <span className="font-normal text-[#605d5d]">(optional)</span></span>
              <input type="url" inputMode="url" value={linkedin} onChange={(e) => setLinkedin(e.target.value)} placeholder="linkedin.com/in/your-name" autoComplete="url" autoCapitalize="none" maxLength={200} aria-invalid={!!badLinkedin} className={clsx(input, badLinkedin ? "border-[#83050b]" : "border-transparent")} />
            </label>
            <label className="flex min-w-0 flex-col gap-1.5">
              <span className={label}>Referral code <span className="font-normal text-[#605d5d]">(optional)</span></span>
              <input type="text" value={ref} onChange={(e) => setRef(e.target.value.toUpperCase())} placeholder="From a friend's link" autoComplete="off" autoCapitalize="characters" spellCheck={false} maxLength={20} aria-invalid={!!badRef} className={clsx(input, badRef ? "border-[#83050b]" : "border-transparent")} />
            </label>
            <div className="flex min-w-0 flex-col gap-1.5">
              <label htmlFor="sd-coupon" className={label}>Coupon code <span className="font-normal text-[#605d5d]">(optional)</span></label>
              <div className="flex gap-2">
                <input
                  id="sd-coupon" type="text" value={coupon} placeholder="If you have one" autoComplete="off" autoCapitalize="characters" spellCheck={false} maxLength={20} aria-invalid={!!badCoupon}
                  onChange={(e) => { setCoupon(e.target.value.toUpperCase()); setApplied(null); setCouponError(""); }}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void applyCoupon(); } }}
                  className={clsx(input, "min-w-0 flex-1", badCoupon ? "border-[#83050b]" : "border-transparent")}
                />
                <button type="button" onClick={() => void applyCoupon()} disabled={checking || !coupon.trim() || !!applied} className="min-h-[50px] flex-none cursor-pointer rounded-[10px] border-2 border-[#83050b] bg-transparent px-4 text-sm font-extrabold text-[#83050b] disabled:cursor-default disabled:opacity-50">
                  {checking ? "Checking…" : applied ? "Applied" : "Apply"}
                </button>
              </div>
              {applied && (price < before
                ? <span role="status" className="text-[13px] font-semibold text-[#2f6b2f]">{applied.code} applied. You pay {money(price)}.</span>
                : <span role="status" className="text-[13px] font-semibold text-[#605d5d]">{applied.code} is valid, but today&apos;s price is already lower, so you pay {money(price)}.</span>)}
            </div>
            <div role="radiogroup" aria-label="I am a" className="flex flex-col gap-1.5">
              <span className={label}>I am a</span>
              <div className="grid grid-cols-2 gap-2">
                {ROLES.map(({ key, label: text, Icon }) => {
                  const on = role === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      aria-label={text}
                      onClick={() => setRole(key)}
                      className={clsx(
                        "flex cursor-pointer flex-col items-start gap-1.5 rounded-xl border-2 p-3 text-left text-ink transition-[border-color,background-color,transform] duration-200 active:scale-[.98]",
                        on ? "border-[#83050b] bg-white" : tried && !role ? "border-[#f0868b] bg-white/55" : "border-[rgba(32,30,29,.14)] bg-white/55",
                      )}
                    >
                      <span className={clsx("flex w-full items-center justify-between", on ? "text-[#83050b]" : "text-[#605d5d]")}>
                        <Icon size={24} aria-hidden="true" />
                        <span className={clsx("box-border size-[18px] rounded-full border-2", on ? "border-[#83050b] bg-[#83050b] shadow-[inset_0_0_0_3px_#fff]" : "border-[#bab6b6]")} />
                      </span>
                      <span className="text-[15px] leading-[1.2] font-extrabold">{text}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            {tried && missing.length > 0 && <p role="alert" className="m-0 text-[13px] font-semibold text-[#83050b]">Add {missing.join(", ")}.</p>}
            {badLinkedin && <p role="alert" className="m-0 text-[13px] font-semibold text-[#83050b]">{badLinkedin}</p>}
            {badRef && <p role="alert" className="m-0 text-[13px] font-semibold text-[#83050b]">{badRef}</p>}
            {badCoupon && <p role="alert" className="m-0 text-[13px] font-semibold text-[#83050b]">{badCoupon}</p>}
            {error && <p role="alert" className="m-0 text-[13px] font-semibold text-[#83050b]">{error}</p>}
            {blocked && (
              <div role="alert" className="flex flex-col gap-2 rounded-[10px] bg-[rgba(131,5,11,.08)] p-3 text-[13px] leading-[1.4] font-semibold text-[#83050b]">
                Google sign-in doesn&apos;t work inside this app. Open this page in Chrome or Safari to buy.
                <button type="button" onClick={() => openInBrowser(campaign)} className="min-h-11 cursor-pointer self-stretch rounded-[10px] border-0 bg-[#83050b] px-4 text-sm font-extrabold text-[#fbf6ee]">Open in browser</button>
                <span>Didn&apos;t open? Tap the ⋯ menu at the top and choose Open in browser, or <button type="button" onClick={copyLink} className="cursor-pointer border-0 bg-transparent p-0 font-semibold text-[#83050b] underline underline-offset-2">{copied ? "link copied" : "copy the link"}</button>.</span>
              </div>
            )}
            <button type="submit" disabled={busy} className="relative flex h-[58px] cursor-pointer items-center justify-between overflow-hidden rounded-xl border-0 bg-[#83050b] px-5 text-[17px] font-extrabold text-[#fbf6ee] shadow-[0_10px_24px_-8px_rgba(131,5,11,.7)] hover:bg-[#690409] disabled:cursor-wait disabled:opacity-80">
              {busy ? (email ? "Reserving your seat…" : "Taking you to Google…") : `Claim my ${money(price)} seat`}<ArrowRight size={20} aria-hidden="true" />
            </button>
          </form>
          <form ref={signIn} action={offerSignIn} hidden>
            <input type="hidden" name="campaign" value={campaign ?? ""} />
            <input type="hidden" name="ref" value={ref} />
            <input type="hidden" name="coupon" value={coupon} />
          </form>

          <p className="m-0 flex items-start gap-2.5 rounded-[10px] bg-[rgba(201,162,74,.16)] px-3 py-2.5 text-[13px] leading-[1.4] text-pretty">
            <span aria-hidden="true" className="flex-none font-extrabold text-[#8a6a1c]">100%</span>
            <span><b>100% back if you finish on schedule.</b> One lesson a day, no missed days, and {FINAL_MARK}% or higher on the final assessment. Start any day you like. <Link href="/refund-policy" className="text-[#605d5d] underline underline-offset-2">T&amp;C apply.</Link></span>
          </p>
          {email ? (
            <form action={offerSwitchAccount} className="text-xs leading-[1.4] text-[#605d5d]">
              <input type="hidden" name="campaign" value={campaign ?? ""} />
              <input type="hidden" name="ref" value={ref} />
              <input type="hidden" name="coupon" value={coupon} />
              Buying as <span className="font-bold break-all text-ink">{email}</span>. <button type="submit" className="cursor-pointer border-0 bg-transparent p-0 underline underline-offset-2">Use a different account</button>
            </form>
          ) : (
            <form action={courseSignIn} onSubmit={(e) => { if (inApp) { e.preventDefault(); step("blocked"); setBlocked(true); } }} className="text-xs leading-[1.4] text-[#605d5d]">
              <input type="hidden" name="lesson" value="" />
              Next you&apos;ll sign in with Google. That account holds your seat. <button type="submit" className="cursor-pointer border-0 bg-transparent p-0 font-bold text-ink underline underline-offset-2">Already bought? Log in</button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
