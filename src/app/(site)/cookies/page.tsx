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
      intro="Two cookies keep you signed in. We measure aggregate usage with Google Analytics, which runs by default, and use Meta Pixel for our Instagram ads only if you allow it. You can change either on this page at any time."
    >
      <Section n="1." title="Your choice" plain="Analytics is on by default. Meta Pixel is off until you tap OK. Change either here.">
        <p>
          On your first visit a small notice tells you about analytics and Meta Pixel. Google Analytics runs by default so we can see, in aggregate,
          which pages people read and where they arrive from. Meta Pixel loads only if you tap OK. If you would rather we did not, switch them off below: the
          scripts stop immediately, on this and every later page.
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
            ["klymb_consent", "Remembers your answer to the cookie notice (OK or No thanks), so we do not ask on every visit. Lasts 180 days."],
            ["klymb_li_state", "Set only while you connect LinkedIn, so we can check that LinkedIn's reply belongs to the request you started. Not readable by page scripts, and deleted when you come back, or after 10 minutes."],
          ]}
        />
      </Section>

      <Section n="3." title="Analytics" plain="Google Analytics 4, aggregate only, on by default, off whenever you want.">
        <Facts
          rows={[
            ["Google Analytics 4", "Measures page views and aggregate usage: which pages people read, which track pages they open, how many registrations complete."],
            ["Vercel Web Analytics and Speed Insights", "Cookieless page-view counts and page-load timings from our hosting provider. They set no cookies and identify no one, so they keep running when Google Analytics is off."],
            ["What we never send", "Your name, email, phone number, GitHub or LinkedIn identity, submissions or answers. None of it is sent to Google."],
            ["Retention", "Google retains this data for 14 months."],
          ]}
        />
        <p>
          <strong>Meta Pixel (only if you tap OK):</strong> tells Meta that this browser opened our pages, viewed the System
          Design course page, started a payment or bought the course, with the amount. Meta uses it to show our Instagram
          and Facebook ads to people who visited, and to measure whether the ads led to a purchase. We never send your
          name, email, phone number or answers. Meta keeps this under its own privacy policy.
        </p>
        <p>
          If you turn analytics off, we stop loading the script immediately for the rest of your visit and on every page
          afterwards. Events Google has already recorded stay until they age out of its 14-month retention window.
        </p>
      </Section>

      <Section n="4." title="What we do not do" plain="No selling data, no data brokers, no pixel without your OK.">
        <p>
          We do not sell personal data, and we do not use third-party data brokers. The only advertising tool we use is
          Meta Pixel, and only after you tap OK. If that ever changes, we will update this policy and ask for your consent
          again before enabling anything new.
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
