import Link from "next/link";
import { footerLinks } from "@/data/program";
import { ChatButton } from "./ChatButton";
import { CloseBanner } from "./CloseBanner";
import { Faq } from "./Faq";
import { Hero } from "./Hero";
import { HeroPhone } from "./HeroPhone";
import { JourneyDock } from "./JourneyDock";
import { LandingNav } from "./LandingNav";
import { Plans } from "./Plans";
import { ScrollMotion } from "./ScrollMotion";
import { Stories } from "./Stories";
import { WhoPanels } from "./WhoPanels";
import { WhySteps } from "./WhySteps";
import { Brand } from "./parts";
import "./landing.css";

/**
 * The klymb.ai homepage, built from the Claude Design file "Klymb Landing v3":
 * hero, why Klymb, who it's for, pricing, learner stories, FAQ and a closing
 * banner, with the journey dock and "Chat with us" floating over the page.
 *
 * Prices and the money-back wording show here even while HIDE_MONEY is on:
 * the owner chose to ship the design as it is (2026-11-11).
 */
export function Landing() {
  return (
    <div className="kl">
      <LandingNav />
      <main id="main">
        <div className="kl-wrap">
          {/* landing.css shows one: HeroPhone up to 760px wide, Hero above. */}
          <Hero />
          <HeroPhone />
        </div>
        <WhySteps />
        <div className="kl-wrap">
          <WhoPanels />
          <Plans />
          <Stories />
          <Faq />
        </div>
        <CloseBanner />
      </main>
      <footer className="kl-footer">
        <span className="kl-footer-copy">
          © {new Date().getFullYear()} <Brand />
        </span>
        <Link href="/organizations">
          <Brand /> for Business
        </Link>
        <a href="#faq">FAQ</a>
        <Link href="/contact">Contact</Link>
        {footerLinks.legal.map((l) => (
          <Link key={l.href} href={l.href}>{l.label}</Link>
        ))}
      </footer>
      <JourneyDock />
      <ChatButton />
      <ScrollMotion />
    </div>
  );
}
