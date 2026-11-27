/** "20261121T133000Z": a time the way calendar links want it. */
const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

const REMINDER_MINUTES = 30;

/**
 * Opens Google Calendar with a short reminder that ends at the person's last
 * moment to start. Null once that moment has passed. Never carries their
 * personal link: the address goes to Google, and a work calendar can be seen
 * by colleagues.
 */
export function deadlineCalendarLink(p: { title: string; company: string; startBy: Date; startByText: string; allowed: string; now?: Date }): string | null {
  if (!(p.startBy.getTime() > (p.now ?? new Date()).getTime())) return null;
  const from = new Date(p.startBy.getTime() - REMINDER_MINUTES * 60000);
  const q = new URLSearchParams({
    action: "TEMPLATE",
    text: `Assessment deadline: ${p.title} (${p.company})`,
    dates: `${stamp(from)}/${stamp(p.startBy)}`,
    details: `Last time to start your assessment from ${p.company}: ${p.startByText}. Time allowed: ${p.allowed}. Open it with the link in your invitation email.`,
  });
  return `https://calendar.google.com/calendar/render?${q}`;
}
