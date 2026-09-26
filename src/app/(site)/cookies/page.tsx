import type { Metadata } from "next";
import Link from "next/link";
import { CookiePreferences } from "@/components/legal/CookiePreferences";
import { Facts, LegalPage, Section } from "@/components/legal/LegalPage";
import { grievance } from "@/data/legal";

export const metadata: Metadata = {
  title: "Cookie Policy",
  description: "What cookies Klymb.ai uses, why, and how to change your choice.",
};

export default function CookiePolicyPage() {
  return (
    <LegalPage
      title="Cookie Policy"
      intro="Two cookies keep you signed in. We also measure aggregate usage with Google Analytics, which runs by default: you can turn it off on this page at any time."
    >
      <Section n="1." title="Your choice" plain="Analytics is on by default. Turn it off here and it stops immediately.">
        <p>
          We do not interrupt you with a cookie pop-up. Google Analytics runs by default so we can see, in aggregate,
          which pages people read and where they arrive from. If you would rather we did not, switch it off below: the
          script stops loading immediately, on this and every later page.
        </p>
        <p>
          Turning it off costs you nothing: every part of the programme, every submission and every page works exactly
          the same.
        </p>
        <CookiePreferences />
      </Section>

      <Section n="2." title="Strictly necessary" plain="Sign-in and your cookie choice. These cannot be switched off.">
        <Facts
          rows={[
            ["Auth.js session cookie", "Keeps you signed in to your learner or admin account. Set only after you sign in, and not readable by page scripts."],
            ["klymb_consent", "Set only if you turn analytics off, so we remember that on later visits. Lasts 180 days."],
          ]}
        />
      </Section>

      <Section n="3." title="Analytics" plain="Google Analytics 4, aggregate only, on by default, off whenever you want.">
        <Facts
          rows={[
            ["Google Analytics 4", "Measures page views and aggregate usage: which pages people read, which track pages they open, how many registrations complete."],
            ["What we never send", "Your name, email, phone number, GitHub or LinkedIn identity, submissions or answers. None of it is sent to Google."],
            ["Retention", "Google retains this data for 14 months."],
          ]}
        />
        <p>
          If you turn analytics off, we stop loading the script immediately for the rest of your visit and on every page
          afterwards. Events Google has already recorded stay until they age out of its 14-month retention window.
        </p>
      </Section>

      <Section n="4." title="What we do not do" plain="No advertising, no pixels, no selling anything.">
        <p>
          We do not sell personal data. We do not use advertising networks, Meta Pixel, cross-site tracking, or
          third-party data brokers. If that ever changes, we will update this policy and ask for your consent again
          before enabling anything new.
        </p>
        <p>
          <strong>Do Not Track:</strong> browsers vary in how they send this signal, so we do not rely on it. Use the
          choice above: it is the control we honour.
        </p>
      </Section>

      <Section n="5." title="Clearing cookies" plain="Delete them in your browser and you will be signed out and asked again.">
        <p>
          You can delete cookies in your browser settings at any time. Doing so signs you out and brings back the choice
          banner on your next visit.
        </p>
      </Section>

      <Section n="6." title="Contact" plain="Questions go to the same address as everything else.">
        <p>
          <a href={`mailto:${grievance.email}`}>{grievance.email}</a>. See also the{" "}
          <Link href="/privacy">Privacy Policy</Link> and <Link href="/contact">entity and grievance details</Link>.
        </p>
      </Section>
    </LegalPage>
  );
}
