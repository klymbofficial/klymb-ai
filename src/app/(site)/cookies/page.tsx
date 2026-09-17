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
      intro="Two cookies keep you signed in and remember your choice. Everything else is optional, and off until you say otherwise."
    >
      <Section n="1." title="Your choice" plain="Accept all, or necessary only. Nothing reaches Google unless you accept.">
        <p>
          On your first visit we ask. Choose <strong>Necessary only</strong> and the Google Analytics script is never
          loaded — no request is made to any Google analytics endpoint at all. Choose <strong>Accept all</strong> and we
          measure aggregate usage.
        </p>
        <p>
          Choosing Necessary only costs you nothing: every part of the programme, every submission and every page works
          exactly the same.
        </p>
        <CookiePreferences />
      </Section>

      <Section n="2." title="Strictly necessary" plain="Sign-in and your cookie choice. These cannot be switched off.">
        <Facts
          rows={[
            ["Auth.js session cookie", "Keeps you signed in to your learner or admin account. Set only after you sign in, and not readable by page scripts."],
            ["klymb_consent", "Remembers the choice you made here, and the policy version it applied to. Lasts 180 days."],
          ]}
        />
      </Section>

      <Section n="3." title="Optional: analytics" plain="Google Analytics 4, aggregate only, and only if you allow it.">
        <Facts
          rows={[
            ["Google Analytics 4", "Measures page views and aggregate usage — which pages people read, which track pages they open, how many registrations complete."],
            ["What we never send", "Your name, email, phone number, GitHub or LinkedIn identity, submissions or answers. None of it is sent to Google."],
            ["Retention", "Google retains this data for 14 months."],
          ]}
        />
        <p>
          If you change your mind and choose Necessary only, we stop loading the script immediately for the rest of your
          visit and on every page afterwards.
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
          choice above — it is the control we honour.
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
