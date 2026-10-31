import "server-only";
import { site } from "@/data/config";
import { grievance } from "@/data/legal";
import { noteEmail, sendMail } from "@/lib/mail";

/**
 * The "you've been added" email for a company member, with the way to sign
 * in. Used by Klymb admin (first HR person) and by HR (People page).
 * Never throws: adding the person has already worked, the email is a courtesy.
 */
export async function sendCompanyInvite(p: { email: string; name: string | null; companyName: string; role: "hr" | "employee" }) {
  const mail = noteEmail({
    subject: `You've been added to ${p.companyName} on Klymb.ai`,
    preview: p.role === "hr" ? `You're the HR contact for ${p.companyName}.` : `${p.companyName} has given you a place on Klymb.ai.`,
    eyebrow: "You're invited",
    title: p.name ? `Welcome, ${p.name}.` : "Welcome to Klymb.ai.",
    intro: p.role === "hr"
      ? `You've been added as an HR contact for ${p.companyName} on Klymb.ai.`
      : `${p.companyName} has added you to Klymb.ai.`,
    heading: "Getting started",
    points: [
      { title: "Open the sign-in page", body: `Go to ${site.url}/org/sign-in.` },
      { title: "Use this email", body: `Enter ${p.email}. We'll email you a 6-digit code: no password needed.` },
    ],
    cta: { href: `${site.url}/org/sign-in`, label: "Sign in" },
    siteUrl: site.url,
    supportEmail: grievance.email,
  });
  try {
    const sent = await sendMail({ to: { email: p.email, ...(p.name ? { name: p.name } : {}) }, ...mail });
    if (!sent.ok) console.error("company invite email failed:", sent.reason);
    return sent.ok;
  } catch (e) {
    console.error("company invite email failed:", e instanceof Error ? e.message : e);
    return false;
  }
}
