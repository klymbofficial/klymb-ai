/**
 * The morning B2B email: each deal owner gets the deals whose next step is
 * due today or overdue, and their open tasks due. Sent beside the Sales
 * follow-up email, not inside it. Pure, so the wording is testable.
 */
import { B2B_STAGES, inr } from "@/lib/b2b";
import { labelOf } from "@/lib/sales";

export interface DueDeal { id: string; company_name: string; title: string; stage: string; value_inr: number; next_step: string | null; next_step_date: string }
export interface DueTask { deal_id: string; company_name: string; title: string; due: string }

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const SHOW = 25;

export function b2bDigestEmail(p: { name: string | null; today: string; deals: DueDeal[]; tasks: DueTask[]; siteUrl: string }) {
  const base = `${p.siteUrl}/admin/sales/b2b`;
  const overdue = p.deals.filter((d) => d.next_step_date < p.today).length;
  const subject = `B2B: ${p.deals.length} deal${p.deals.length === 1 ? "" : "s"} to move today${overdue ? ` (${overdue} overdue)` : ""}${p.tasks.length ? `, ${p.tasks.length} task${p.tasks.length === 1 ? "" : "s"}` : ""}`;
  const when = (day: string) => (day < p.today ? `overdue since ${day}` : "today");
  const deals = p.deals.slice(0, SHOW);
  const tasks = p.tasks.slice(0, SHOW);

  const dealRows = deals.map((d) => `
    <tr><td style="padding:8px 0;border-bottom:1px solid #eee">
      <a href="${base}/deals/${d.id}" style="color:#201e1d;font-weight:700">${esc(d.company_name)}</a>
      <span style="color:#5a5757"> · ${esc(labelOf(B2B_STAGES, d.stage))}${d.value_inr ? ` · ${inr(d.value_inr)}` : ""} · ${when(d.next_step_date)}</span>
      ${d.next_step ? `<div style="font-size:13px">${esc(d.next_step)}</div>` : ""}
    </td></tr>`).join("");
  const taskRows = tasks.map((t) => `
    <tr><td style="padding:6px 0;border-bottom:1px solid #eee">
      <a href="${base}/deals/${t.deal_id}" style="color:#201e1d;font-weight:700">${esc(t.title)}</a>
      <span style="color:#5a5757"> · ${esc(t.company_name)} · ${when(t.due)}</span>
    </td></tr>`).join("");

  const html = `
  <div style="font-family:Arial,sans-serif;max-width:560px;color:#201e1d">
    <p>Good morning${p.name ? ` ${esc(p.name)}` : ""},</p>
    ${deals.length ? `<p><b>${p.deals.length}</b> B2B deal${p.deals.length === 1 ? " has its" : "s have their"} next step due${overdue ? `, ${overdue} overdue` : ""}.</p>
    <table style="width:100%;border-collapse:collapse;font-size:14px">${dealRows}</table>` : ""}
    ${tasks.length ? `<p style="margin-top:16px"><b>Tasks due</b></p><table style="width:100%;border-collapse:collapse;font-size:14px">${taskRows}</table>` : ""}
    ${p.deals.length > SHOW || p.tasks.length > SHOW ? `<p style="color:#5a5757">…and more in the app.</p>` : ""}
    <p><a href="${base}/deals?due=1" style="display:inline-block;background:#201e1d;color:#fff;padding:10px 16px;text-decoration:none;font-weight:700">Open B2B deals due</a></p>
    <p style="color:#8f8c8b;font-size:12px">Sent each morning by Klymb Sales to the owner of these deals.</p>
  </div>`;

  const text = [
    `Good morning${p.name ? ` ${p.name}` : ""},`,
    deals.length ? `${p.deals.length} B2B deal${p.deals.length === 1 ? "" : "s"} with the next step due${overdue ? `, ${overdue} overdue` : ""}:` : "",
    ...deals.map((d) => `- ${d.company_name}, ${labelOf(B2B_STAGES, d.stage)}${d.value_inr ? `, ${inr(d.value_inr)}` : ""}, ${when(d.next_step_date)}${d.next_step ? `: ${d.next_step}` : ""}`),
    tasks.length ? "\nTasks due:" : "",
    ...tasks.map((t) => `- ${t.title} (${t.company_name}), ${when(t.due)}`),
    "",
    `Open them: ${base}/deals?due=1`,
  ].filter((l, i, a) => l !== "" || a[i - 1] !== "").join("\n");

  return { subject, html, text };
}
