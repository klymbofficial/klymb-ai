import type { Metadata } from "next";
import Link from "next/link";
import { Facts, LegalPage, Section } from "@/components/legal/LegalPage";
import { contact, socials } from "@/data/config";
import { entity, grievance } from "@/data/legal";

export const metadata: Metadata = {
  title: "Contact",
  description: "Entity details and grievance contact for Klymb.ai, operated by BIGBETS.AI.",
};

export default function ContactPage() {
  return (
    <LegalPage
      title="Contact"
      intro="Entity details and grievance contacts, published under India's Digital Personal Data Protection Act 2023, the Information Technology Rules 2021, and the Consumer Protection (E-Commerce) Rules 2020."
    >
      <Section n="1." title="Talk to us" plain="One address for questions about the cohort, your place or your data.">
        <p>
          Email <a href={`mailto:${contact.email}`}>{contact.email}</a> — about tracks, the cohort, your enrolment or
          anything on this site.
        </p>
        <ul>
          {socials.map((s) => (
            <li key={s.href}>
              {s.label}: <a href={s.href} target="_blank" rel="noopener noreferrer">{s.handle}</a>
            </li>
          ))}
        </ul>
      </Section>

      <Section n="2." title="Entity details">
        <Facts
          rows={[
            ["Brand", entity.brand],
            ["Registered entity", entity.registeredName],
            ["Entity type", entity.entityType],
            ["Enterprise scale", entity.enterpriseScale],
            ["Major activity", entity.majorActivity],
            ["Industry (NIC)", entity.nic],
            ["Proprietor", entity.proprietor],
            ["Udyam registration number", entity.udyamNumber],
            ["Udyam registration date", entity.udyamDate],
            ["Date of incorporation", entity.incorporationDate],
            ["Registered address", entity.address],
          ]}
        />
      </Section>

      <Section n="3." title="Grievance Officer" plain="Complaints about the service, your data or a refund decision go here. We reply within 24 hours.">
        <Facts
          rows={[
            ["Name", grievance.name],
            ["Designation", grievance.designation],
            ["Email", grievance.email],
            ["Address", grievance.address],
          ]}
        />
        <p>
          We acknowledge grievances within {grievance.acknowledgeWithin} and aim to resolve them within{" "}
          {grievance.resolveWithin}. If you are not satisfied with our response, you may escalate to the Data Protection
          Board of India.
        </p>
      </Section>

      <Section n="4." title="Data rights requests" plain="Ask for a copy of your data, a correction, or deletion.">
        <p>
          Email <a href={`mailto:${grievance.email}`}>{grievance.email}</a> with what you want — access, correction,
          erasure, withdrawal of consent, or to nominate someone to act for you. We respond within 30 days and may need
          to verify your identity first. What we hold and why is set out in the{" "}
          <Link href="/privacy">Privacy Policy</Link>.
        </p>
      </Section>
    </LegalPage>
  );
}
