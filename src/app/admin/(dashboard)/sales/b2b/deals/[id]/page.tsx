import Link from "next/link";
import { notFound } from "next/navigation";
import { PageTitle } from "@/components/admin/PageTitle";
import { ActivityForm, Contacts, DealDetailsForm, DeleteDeal, DocChecklist, StageControl, StatusNote, Tasks, Workspace } from "@/components/admin/b2b/B2BForms";
import { B2BStageBadge, B2BTabs, docNames, NextStep, personName, when } from "@/components/admin/b2b/parts";
import { requireSalesAdmin } from "@/lib/admin/auth";
import { getB2BPeople, getDeal } from "@/lib/admin/b2b";
import {
  ACTIVITY_KINDS, attention, B2B_SOURCES, B2B_STAGES, daysBetween, DELIVERY_MODES, inr, isOpenStage, LOST_REASONS,
  PAYMENT_STATUSES, PAYMENT_TERMS, weighted, winChance,
} from "@/lib/b2b";
import { istToday, labelOf } from "@/lib/sales";

export const metadata = { title: "Deal · B2B" };

function Fact({ label, children, tone }: { label: string; children: React.ReactNode; tone?: "red" }) {
  return (
    <div>
      <dt className="text-[11px] font-bold uppercase tracking-wider text-muted">{label}</dt>
      <dd className={`mt-0.5 ${tone === "red" ? "font-bold text-red-deep" : ""}`}>{children}</dd>
    </div>
  );
}

export default async function B2BDealPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requireSalesAdmin();
  const [found, people] = await Promise.all([getDeal((await params).id), getB2BPeople()]);
  if (!found) notFound();
  const { deal: d, company: c, contacts, docs, activities, tasks, history, siblings } = found;
  const today = istToday();
  const a = attention(d, today);
  const open = isOpenStage(d.stage);
  const who = (e: string | null) => personName(people, e, admin.email);
  const primary = contacts.find((p) => p.is_primary) ?? null;

  return (
    <>
      <PageTitle
        eyebrow={`Sales · B2B · ${labelOf(B2B_SOURCES, d.source)}`}
        title={c.name}
        intro={[d.title, primary && `${primary.name}${primary.designation ? `, ${primary.designation}` : ""}`, c.city].filter(Boolean).join(" · ")}
        actions={<Link href="/admin/sales/b2b/deals" className="text-xs font-bold uppercase tracking-wider underline underline-offset-4 hover:text-red-deep">← All deals</Link>}
      />
      <B2BTabs current="none" />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <B2BStageBadge stage={d.stage} />
        <span className="text-xs text-muted nums">{daysBetween(d.stage_changed_at, today)} days in this stage</span>
        {a.stale && <span className="bg-red-tint px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-wider text-red-deep">Going stale</span>}
        <StatusNote key={d.status_note ?? ""} id={d.id} value={d.status_note} />
      </div>

      <dl className="card mb-4 grid grid-cols-2 gap-4 p-4 text-sm sm:grid-cols-3 lg:grid-cols-6">
        <Fact label="Value">{d.value_inr ? <b className="nums">{inr(d.value_inr)}</b> : "Not set"}{d.seats ? <span className="text-muted nums"> · {d.seats} seats</span> : null}</Fact>
        <Fact label={`Weighted at ${winChance(d.stage)}%`}><span className="nums">{inr(weighted(d.value_inr, d.stage))}</span></Fact>
        <Fact label="Next step" tone={open && (a.overdue || a.noNextStep) ? "red" : undefined}><NextStep d={d} today={today} /></Fact>
        <Fact label="Expected to sign">{d.expected_close ?? "Not set"}</Fact>
        <Fact label="Owner">{who(d.owner_email)}</Fact>
        <Fact label="Last touch">{d.last_activity_at ? <>{when(d.last_activity_at)}{d.last_by && ` · ${who(d.last_by)}`}</> : "Not contacted yet"}</Fact>
        {d.stage === "lost" && d.lost_reason && <Fact label="Lost because">{labelOf(LOST_REASONS, d.lost_reason)}{d.lost_note && ` · ${d.lost_note}`}</Fact>}
        {d.stage === "signed" && (
          <>
            <Fact label="Signed">{d.signed_at ? when(d.signed_at) : "—"}</Fact>
            <Fact label="Payment">{labelOf(PAYMENT_STATUSES, d.payment_status)}{d.payment_terms && ` · ${labelOf(PAYMENT_TERMS, d.payment_terms)}`}</Fact>
            <Fact label="Cohort starts">{d.cohort_start ?? "Not set"}</Fact>
            <Fact label="Renewal">{d.renewal_date ?? "Not set"}</Fact>
          </>
        )}
        {d.courses && <Fact label="Courses">{d.courses}{d.delivery_mode && ` · ${labelOf(DELIVERY_MODES, d.delivery_mode)}`}</Fact>}
      </dl>

      <section className="card mb-6 p-4"><StageControl key={d.stage} id={d.id} stage={d.stage} docs={docs} /></section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section aria-labelledby="docs" className="card p-5">
          <h2 id="docs" className="display text-xl">Documents</h2>
          <p className="text-xs text-muted">
            {d.pending_docs.length ? `Still open: ${docNames(d.pending_docs)}. Signed needs each one signed or marked not needed.` : "Everything needed is signed."}
            {" "}Templates are in docs/legal/templates.
          </p>
          <DocChecklist dealId={d.id} docs={docs} />
        </section>

        <section aria-labelledby="log" className="card p-5">
          <h2 id="log" className="display mb-3 text-xl">Log a call, message or meeting</h2>
          <ActivityForm dealId={d.id} />
        </section>

        <section aria-labelledby="tasks" className="card p-5">
          <h2 id="tasks" className="display mb-3 text-xl">Tasks</h2>
          <Tasks dealId={d.id} tasks={tasks} people={people} me={admin.email} today={today} />
        </section>

        <section aria-labelledby="people" className="card p-5">
          <div className="mb-2 flex items-baseline justify-between">
            <h2 id="people" className="display text-xl">People at {c.name}</h2>
            <Link href={`/admin/sales/b2b/companies/${c.id}`} className="text-xs font-bold underline">Company</Link>
          </div>
          <Contacts companyId={c.id} contacts={contacts} />
        </section>

        {d.stage === "signed" && (
          <section aria-labelledby="ws" className="card p-5 lg:col-span-2">
            <h2 id="ws" className="display mb-2 text-xl">Workspace</h2>
            {c.workspace_slug ? (
              <div className="text-sm">
                <p>
                  <Link href={`/org/${c.workspace_slug}`} className="font-bold underline">klymb.ai/org/{c.workspace_slug}</Link>
                  <span className="text-muted nums"> · {c.workspace_members ?? 0} of {c.workspace_seats ?? 0} seats used</span>
                </p>
                {c.workspace_seats !== null && d.seats > c.workspace_seats && (
                  <p className="mt-1 text-xs font-bold text-red-deep">The deal is for {d.seats} seats but the workspace has {c.workspace_seats}. Raise it in Companies.</p>
                )}
                <Link href="/admin/companies" className="mt-2 inline-block text-xs font-bold underline">Manage in Companies</Link>
              </div>
            ) : (
              <Workspace dealId={d.id} b2bCompanyId={c.id} companyName={c.name} contactEmail={primary?.email ?? null} seats={d.seats} />
            )}
          </section>
        )}
      </div>

      <section aria-labelledby="history" className="card mt-6 p-5">
        <h2 id="history" className="display text-xl">History</h2>
        {activities.length === 0 && history.length === 0 ? <p className="mt-2 text-sm text-muted">Nothing logged yet.</p> : (
          <ol className="mt-3 flex flex-col divide-y divide-line/15">
            {[
              ...activities.map((x) => ({ at: x.created_at, el: (
                <>
                  <p className="text-xs text-muted nums">
                    <b className="text-ink">{labelOf(ACTIVITY_KINDS, x.kind)}</b> · {when(x.created_at)} · {who(x.by_email)}
                    {x.replied && x.kind !== "meeting" && <span className="ml-2 font-bold text-emerald-800">They responded</span>}
                  </p>
                  {x.attendees && <p className="text-xs text-muted">With {x.attendees}</p>}
                  {x.note && <p className="mt-0.5 whitespace-pre-line">{x.note}</p>}
                </>
              ) })),
              ...history.map((h) => ({ at: h.at, el: (
                <p className="text-xs text-muted nums">
                  <b className="text-ink">{h.from_stage ? `${labelOf(B2B_STAGES, h.from_stage)} → ${labelOf(B2B_STAGES, h.to_stage)}` : "Deal added"}</b> · {when(h.at)} · {who(h.by_email)}
                </p>
              ) })),
            ].sort((x, y) => (x.at < y.at ? 1 : -1)).map((x, i) => <li key={i} className="py-2.5 text-sm">{x.el}</li>)}
          </ol>
        )}
      </section>

      {siblings.length > 0 && (
        <section className="mt-6 text-sm">
          <h2 className="display mb-2 text-xl">Other deals with {c.name}</h2>
          <ul className="flex flex-wrap gap-2">
            {siblings.map((s) => (
              <li key={s.id}><Link href={`/admin/sales/b2b/deals/${s.id}`} className="card inline-flex items-center gap-2 px-3 py-2 hover:underline">{s.title} <B2BStageBadge stage={s.stage} /> <span className="nums text-muted">{inr(s.value_inr)}</span></Link></li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="details" className="mt-8">
        <h2 id="details" className="display mb-3 text-2xl">Deal details</h2>
        <DealDetailsForm
          key={d.id + d.stage + (d.next_step_date ?? "")}
          id={d.id}
          people={people}
          open={open}
          value={{
            title: d.title, owner_email: d.owner_email ?? "", source: d.source, courses: d.courses ?? "",
            seats: d.seats ? String(d.seats) : "", price_per_seat: d.price_per_seat === null ? "" : String(d.price_per_seat),
            discount_inr: d.discount_inr ? String(d.discount_inr) : "", value_inr: d.value_inr ? String(d.value_inr) : "",
            payment_terms: d.payment_terms ?? "", payment_status: d.payment_status, po_number: d.po_number ?? "",
            delivery_mode: d.delivery_mode ?? "", expected_close: d.expected_close ?? "", cohort_start: d.cohort_start ?? "",
            renewal_date: d.renewal_date ?? "", next_step: d.next_step ?? "", next_step_date: d.next_step_date ?? "",
            status_note: d.status_note ?? "", notes: d.notes ?? "",
          }}
        />
        <div className="mt-4"><DeleteDeal id={d.id} title={d.title} /></div>
      </section>
    </>
  );
}
