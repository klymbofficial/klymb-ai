import "server-only";
import { cohort, site } from "@/data/config";
import { grievance } from "@/data/legal";
import { getTrack } from "@/data/tracks";
import { formatDate, formatINR } from "@/lib/format";
import { sendMail, welcomeEmail } from "@/lib/mail";

/**
 * The welcome email for a new registration. Called only when the registration
 * row was newly inserted, so registering again never sends it twice. A failed
 * send is logged and dropped: registration must never fail because of email.
 */
export async function sendWelcome({ email, name, track }: { email: string; name: string; track: string }) {
  const t = getTrack(track);
  if (!t) return;
  const mail = welcomeEmail({
    name: name.split(" ")[0] || "there",
    trackName: t.name,
    becomes: t.becomes,
    price: formatINR(t.price),
    startDate: formatDate(cohort.startDate),
    deadline: formatDate(cohort.enrollmentDeadline),
    siteUrl: site.url,
    supportEmail: grievance.email,
  });
  const sent = await sendMail({ to: { email, name }, ...mail });
  if (!sent.ok) console.error("welcome email failed:", sent.reason);
}
