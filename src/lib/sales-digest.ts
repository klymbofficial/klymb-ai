/**
 * The morning follow-up email: each owner gets their due and overdue leads,
 * the way a CRM's daily task digest works. Pure, so the wording is testable.
 */
import { formatPhone, labelOf, STAGES } from "@/lib/sales";

export interface DueLead {
  id: string;
  name: string;
  phone: string | null;
  stage: string;
  next_follow_up: string;
  notes: string | null;
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const SHOW = 25;

export function salesDigestEmail(p: { name: string | null; today: string; leads: DueLead[]; siteUrl: string }) {
  const overdue = p.leads.filter((l) => l.next_follow_up < p.today).length;
  const count = p.leads.length;
  const subject = `${count} follow-up${count === 1 ? "" : "s"} today${overdue ? ` (${overdue} overdue)` : ""}`;
  const listUrl = `${p.siteUrl}/admin/sales/leads?due=1`;
  const shown = p.leads.slice(0, SHOW);
  const more = count - shown.length;
  const when = (l: DueLead) => (l.next_follow_up < p.today ? `overdue since ${l.next_follow_up}` : "today");

  const rows = shown.map((l) => `
    <tr>
      <td style="padding:8px 0;border-bottom:1px solid #eee">
        <a href="${p.siteUrl}/admin/sales/leads/${l.id}" style="color:#201e1d;font-weight:700">${esc(l.name)}</a>
        <span style="color:#5a5757"> · ${esc(formatPhone(l.phone))} · ${esc(labelOf(STAGES, l.stage))} · ${when(l)}</span>
        ${l.notes ? `<div style="color:#5a5757;font-size:13px">${esc(l.notes.slice(0, 140))}</div>` : ""}
      </td>
    </tr>`).join("");

  const html = `
  <div style="font-family:Arial,sans-serif;max-width:560px;color:#201e1d">
    <p>Good morning${p.name ? ` ${esc(p.name)}` : ""},</p>
    <p>You have <b>${count}</b> follow-up${count === 1 ? "" : "s"} due${overdue ? `, ${overdue} of them overdue` : ""}.</p>
    <table style="width:100%;border-collapse:collapse;font-size:14px">${rows}</table>
    ${more > 0 ? `<p style="color:#5a5757">…and ${more} more.</p>` : ""}
    <p><a href="${listUrl}" style="display:inline-block;background:#201e1d;color:#fff;padding:10px 16px;text-decoration:none;font-weight:700">Open my follow-ups</a></p>
    <p style="color:#8f8c8b;font-size:12px">Sent each morning by Klymb Sales to the owner of these leads.</p>
  </div>`;

  const text = [
    `Good morning${p.name ? ` ${p.name}` : ""},`,
    `You have ${count} follow-up${count === 1 ? "" : "s"} due${overdue ? `, ${overdue} overdue` : ""}.`,
    "",
    ...shown.map((l) => `- ${l.name} (${formatPhone(l.phone)}), ${labelOf(STAGES, l.stage)}, ${when(l)}${l.notes ? `: ${l.notes.slice(0, 140)}` : ""}`),
    more > 0 ? `...and ${more} more.` : "",
    "",
    `Open them: ${listUrl}`,
  ].join("\n");

  return { subject, html, text };
}
