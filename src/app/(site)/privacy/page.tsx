import type { Metadata } from "next";
import Link from "next/link";
import { Facts, LegalPage, Section } from "@/components/legal/LegalPage";
import { cohort } from "@/data/config";
import { dataPoints, entity, grievance, entityRows } from "@/data/legal";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Klymb.ai collects, uses and protects your personal data, under India's Digital Personal Data Protection Act, 2023.",
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      intro="How we collect, use, share and protect your personal data — written around what this product actually does, and India's Digital Personal Data Protection Act, 2023."
    >
      <Section n="1." title="Who we are" plain="Klymb.ai is run by Creators Enterprises Private Limited. We decide why and how your data is used, which makes us the Data Fiduciary. Our Grievance Officer, below, is the person to contact.">
        <Facts
          rows={entityRows}
        />
        <h3>Grievance Officer</h3>
        <Facts
          rows={[
            ["Name", grievance.name],
            ["Designation", grievance.designation],
            ["Email", grievance.email],
            ["Address", grievance.address],
          ]}
        />
        <p>
          We acknowledge grievances within {grievance.acknowledgeWithin} and aim to resolve them within {grievance.resolveWithin}.
          If our response does not satisfy you, you may escalate to the Data Protection Board of India.
        </p>
      </Section>

      <Section n="2." title="What we collect" plain="What you type into the registration form, what Google tells us when you sign in, the coursework you submit, and — only if you allow cookies — aggregate analytics.">
        <Facts rows={dataPoints.collected} />
        <p>
          We do not collect payment card details. Payments are not yet live on this service; when they are, they will be
          handled by a payment provider and this Policy will be updated before that happens.
        </p>
        <p>
          <strong>We never ask for, and you should never submit, sensitive data</strong> such as government ID numbers,
          financial account details or health information. Do not put employer-confidential material in your coursework.
        </p>
      </Section>

      <Section n="3." title="Why we use it" plain="To run the cohort you signed up for, to contact you about it, and to review your work.">
        <ul>
          <li>Creating and running your account, and signing you in</li>
          <li>Reserving your cohort place and giving you access to the daily programme</li>
          <li>Storing your submissions so reviewers can score them and give feedback</li>
          <li>Checking that submitted GitHub and LinkedIn links belong to the account you declared</li>
          <li>Emailing or calling you about your registration, your cohort and your results</li>
          <li>Keeping the service secure, and preventing abuse of the registration form</li>
          <li>Understanding, in aggregate, how the site is used, unless you have turned analytics off</li>
        </ul>
      </Section>

      <Section n="4." title="Our lawful basis" plain="Some things we do because you asked us to provide the programme; optional things, like analytics cookies and marketing contact, we do only with your consent.">
        <p>
          <strong>Necessary to provide the service you asked for:</strong> creating your account, reserving your place,
          storing and reviewing your submissions, verifying evidence, issuing results, and keeping the service secure.
          Without this processing we cannot run the cohort.
        </p>
        <p>
          <strong>Consent:</strong> the contact permission you give on the registration form. You can withdraw it at any
          time — see section 8. Withdrawal does not undo processing already lawfully carried out.
        </p>
        <p>
          <strong>Analytics:</strong> aggregate measurement runs by default and is not tied to your identity — we never
          send your name, email, phone or submissions to Google. You can switch it off at any time at{" "}
          <Link href="/cookies">/cookies</Link>.
        </p>
      </Section>

      <Section n="5." title="Who we share it with" plain="Only the services that run the product. We do not sell your data.">
        <Facts rows={dataPoints.processors.map(([a, b, c]) => [a, `${b} — ${c}`] as const)} />
        <p>
          Reviewers and administrators of Klymb.ai see your submissions and evidence links in order to score your work.
          Nobody else can see another learner&apos;s submissions: access is enforced in the database itself, not only in the interface.
        </p>
        <p><strong>We do not sell personal data, and we do not use advertising or cross-site tracking networks.</strong></p>
      </Section>

      <Section n="6." title="International transfers" plain="Some of our providers store data outside India — mainly the United States and Japan.">
        <p>
          Our database is hosted in Tokyo, Japan, and our hosting and sign-in providers operate globally, including in the
          United States. By using the service you understand that your data may be processed in those countries. We use
          established providers and rely on their contractual protections.
        </p>
      </Section>

      <Section n="7." title="How long we keep it" plain="Registrations and coursework stay while your cohort runs and for a period afterwards, so your record and certificate remain verifiable. Ask us to delete it and we will.">
        <ul>
          <li><strong>Registrations that do not enrol:</strong> kept for 24 months, so we can tell you when a track opens, then deleted.</li>
          <li><strong>Learner records and submissions:</strong> kept for 24 months after the cohort ends, so results and feedback remain available to you.</li>
          <li><strong>Technical logs:</strong> kept for the short period our hosting provider retains them.</li>
          <li><strong>Records we must keep:</strong> proof of refund decisions and consent records, kept as long as needed for tax, accounting or a dispute.</li>
        </ul>
      </Section>

      <Section n="8." title="Your rights" plain="Get a copy of your data, correct it, delete it, withdraw consent, complain, or nominate someone to act for you.">
        <ul>
          <li><strong>Access:</strong> ask for a copy of the personal data we hold about you.</li>
          <li><strong>Correction:</strong> have inaccurate or incomplete data corrected.</li>
          <li><strong>Erasure:</strong> ask us to delete your account and data, subject to records we must keep.</li>
          <li><strong>Withdraw consent:</strong> stop marketing contact, or turn analytics cookies off at any time.</li>
          <li><strong>Grievance:</strong> complain to our Grievance Officer, whatever else you have done. We acknowledge in {grievance.acknowledgeWithin} and aim to resolve in {grievance.resolveWithin}, and you may escalate to the Data Protection Board of India.</li>
          <li><strong>Nomination:</strong> nominate someone to exercise these rights if you die or become incapacitated.</li>
        </ul>
        <p>
          Email <a href={`mailto:${grievance.email}`}>{grievance.email}</a> and we will respond within 30 days.
          We may need to verify who you are first.
        </p>
      </Section>

      <Section n="9." title="Security" plain="HTTPS everywhere, access rules enforced in the database, and secrets kept server-side. No system is perfectly secure.">
        <ul>
          <li>The site is served over HTTPS.</li>
          <li>Access rules live in the database: a learner can only read their own record, and the public can only add a registration, never read one.</li>
          <li>Administrative access is limited to an allowlist of email addresses, checked on every request.</li>
          <li>Keys and secrets are stored as server configuration, never in the browser.</li>
        </ul>
        <p>
          If a personal data breach occurs, we will notify the Data Protection Board of India and affected users as
          required by the DPDP Act.
        </p>
      </Section>

      <Section n="10." title="Children" plain="This is an 18+ service.">
        <p>Klymb.ai is for adults. We do not knowingly collect data from anyone under 18. If you believe a minor has registered, contact us and we will delete the account.</p>
      </Section>

      <Section n="11." title="Cookies" plain="What is needed to sign you in, plus analytics you can switch off.">
        <p>
          See the <Link href="/cookies">Cookie Policy</Link> for what each cookie does, and for the switch that turns
          analytics off.
        </p>
      </Section>

      <Section n="12." title="Changes" plain="If we change something material, we will post a new version and tell you.">
        <p>
          The version and effective date are at the top of this page. Material changes to what we collect or how we use
          it will be signalled with a new version, and where we reasonably can we will email the address on your account.
          The cohort starting {cohort.startDate} is governed by the version in force when you registered, unless you accept a newer one.
        </p>
      </Section>

      <Section n="13." title="Contact" plain="One address for everything.">
        <p>
          Privacy questions, data rights requests and grievances:{" "}
          <a href={`mailto:${grievance.email}`}>{grievance.email}</a>. Entity and grievance details are also published
          at <Link href="/contact">/contact</Link>.
        </p>
      </Section>
    </LegalPage>
  );
}
