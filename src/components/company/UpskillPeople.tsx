"use client";

import clsx from "clsx";
import { useMemo, useState, useSyncExternalStore, useTransition } from "react";
import { changeLearnerDue, removeAssignment, sendUpskillReminder, type ConfirmResult } from "@/app/org/[slug]/(workspace)/learning/actions";
import { AssignPanel, type PanelPerson } from "@/components/company/AssignPanel";
import { Badge, BTN_PRIMARY, BTN_SECONDARY, PANEL, SearchBox, type Tone } from "@/components/company/HiringParts";
import { Overlay, useConfirm } from "@/components/company/Overlay";
import type { TrackedCourse } from "@/lib/company/upskill-course";
import type { CoursePerson } from "@/lib/company/upskill-data";
import { PEOPLE_FILTERS, STATUS_LABEL, attentionReason, learnerStatus, peopleTags, type LearnerStatus, type PeopleFilter } from "@/lib/company/upskill-view";

const noop = () => () => {};
const STATUS_TONE: Record<LearnerStatus, Tone> = { not_assigned: "grey", not_started: "grey", in_progress: "blue", completed: "green" };
const PAGE = 25;
const day = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
const dueText = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

/** "Today", "Yesterday", "3 days ago", or the date. */
function ago(iso: string | null, now: number): string {
  if (!iso) return "—";
  const d = Math.floor((now - new Date(iso).getTime()) / 86400000);
  return d <= 0 ? "Today" : d === 1 ? "Yesterday" : d < 30 ? `${d} days ago` : day(iso);
}

function Bar({ value, total, tone = "#1f4fd1" }: { value: number; total: number; tone?: string }) {
  const pct = total ? Math.round((value / total) * 100) : 0;
  return (
    <span className="flex items-center gap-2">
      <span aria-hidden="true" className="h-1.5 w-24 overflow-hidden rounded-full bg-[#e8e6e5]"><span className="block h-full rounded-full" style={{ width: `${pct}%`, background: tone }} /></span>
      <span className="text-xs tabular-nums text-muted">{value}/{total}</span>
    </span>
  );
}

function Avatar({ name }: { name: string }) {
  return <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink text-xs font-bold text-paper">{name.trim()[0]?.toUpperCase() ?? "?"}</span>;
}

/**
 * The course's People tab (user, 26 Nov): a filter rail with counts (status,
 * overdue, inactive, not assigned), search and a team filter over one table.
 * Clicking someone opens a side panel with their progress module by module
 * and, for whoever assigns, a reminder email, their due date and removal.
 */
export function UpskillPeople({
  slug, course, people, totalLessons, now, canAssign, showTeam, assign, initialFilter, initialPerson,
}: {
  slug: string;
  course: TrackedCourse;
  people: CoursePerson[];
  totalLessons: number;
  now: string;
  canAssign: boolean;
  showTeam: boolean;
  assign: { people: PanelPerson[]; teams: { id: string; name: string }[]; canEveryone: boolean } | null;
  initialFilter: PeopleFilter;
  initialPerson: string | null;
}) {
  const nowDate = useMemo(() => new Date(now), [now]);
  const at = nowDate.getTime();
  const [filter, setFilter] = useState<PeopleFilter>(initialFilter);
  const [query, setQuery] = useState("");
  const [team, setTeam] = useState("all");
  const [page, setPage] = useState(0);
  const [open, setOpen] = useState<string | null>(initialPerson);
  // A link to one person (from Overview's "Needs a nudge") opens their panel once the page is up: the
  // panel renders in the browser only, so showing it in the server's render would disagree with it.
  const hydrated = useSyncExternalStore(noop, () => true, () => false);
  const [assigning, setAssigning] = useState<string | null | false>(false);
  const [result, setResult] = useState<ConfirmResult | null>(null);

  const facts = (p: CoursePerson) => p;
  const tagged = useMemo(() => people.map((p) => ({ p, tags: peopleTags(facts(p), totalLessons, nowDate) })), [people, totalLessons, nowDate]);
  const counts = useMemo(() => {
    const c = Object.fromEntries(PEOPLE_FILTERS.map((f) => [f.key, 0])) as Record<PeopleFilter, number>;
    for (const t of tagged) for (const k of t.tags) c[k] += 1;
    return c;
  }, [tagged]);
  const teams = [...new Set(people.map((p) => p.teamName).filter((t): t is string => !!t))].sort();
  const q = query.trim().toLowerCase();
  const matching = tagged
    .filter((t) => t.tags.includes(filter))
    .filter((t) => team === "all" || (team === "none" ? !t.p.teamName : t.p.teamName === team))
    .filter((t) => !q || t.p.email.includes(q) || (t.p.name ?? "").toLowerCase().includes(q))
    .map((t) => t.p);
  const pages = Math.max(1, Math.ceil(matching.length / PAGE));
  const pageAt = Math.min(page, pages - 1);
  const shown = matching.slice(pageAt * PAGE, pageAt * PAGE + PAGE);
  const person = people.find((p) => p.email === open) ?? null;
  const pick = (f: PeopleFilter) => { setFilter(f); setPage(0); };

  return (
    <>
      {result && (
        <p role={result.ok ? "status" : "alert"} className={clsx("mb-4 rounded-md px-4 py-3 text-sm font-semibold", result.ok ? "bg-[#e4f2ec] text-[#14532d]" : "bg-error-tint text-error")}>{result.message}</p>
      )}
      <div className={clsx(PANEL, "flex flex-col lg:flex-row")}>
        <nav aria-label="People" className="border-b border-line/30 p-2 lg:w-56 lg:shrink-0 lg:border-r lg:border-b-0 lg:py-4">
          <p className="hidden px-3 pb-2 text-[0.7rem] font-extrabold uppercase tracking-[0.12em] text-muted lg:block">People</p>
          <ul className="flex gap-1 overflow-x-auto lg:flex-col">
            {PEOPLE_FILTERS.filter((f) => f.key !== "not_assigned" || canAssign || counts.not_assigned > 0).map((f) => {
              const on = f.key === filter;
              return (
                <li key={f.key} className="shrink-0">
                  <button type="button" aria-pressed={on} onClick={() => pick(f.key)} className={clsx("flex min-h-10 w-full items-center justify-between gap-3 whitespace-nowrap rounded-md px-3 text-left text-sm", on ? "bg-[#eef2fd] font-semibold text-[#1f4fd1]" : "hover:bg-paper")}>
                    <span>{f.label}</span>
                    <span className={clsx("min-w-7 rounded-full px-2 text-center text-xs font-bold", on ? "bg-[#1f4fd1] text-white" : (f.key === "overdue" || f.key === "inactive") && counts[f.key] ? "bg-[#fdf1e7] text-[#6b3300]" : "text-ink")}>{counts[f.key]}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3 border-b border-line/25 px-4 py-3">
            <h2 className="mr-auto text-base font-semibold tabular-nums">{PEOPLE_FILTERS.find((f) => f.key === filter)!.label} ({matching.length})</h2>
            <SearchBox label="Search people" placeholder="Search by name or email" value={query} onChange={(v) => { setQuery(v); setPage(0); }} />
            {showTeam && teams.length > 0 && (
              <label>
                <span className="sr-only">Team</span>
                <select value={team} onChange={(e) => { setTeam(e.target.value); setPage(0); }} className="h-10 rounded-md border border-line/50 bg-white px-3 text-sm">
                  <option value="all">All teams</option>
                  {teams.map((t) => <option key={t} value={t}>{t}</option>)}
                  <option value="none">No team</option>
                </select>
              </label>
            )}
          </div>

          {shown.length === 0 ? (
            <p className="px-4 py-12 text-center text-sm text-muted">
              {filter === "overdue" ? "Nobody is overdue." : filter === "inactive" ? "Everyone in progress has been active this week." : people.length ? "Nobody matches. Try another filter or search." : "Nobody here yet."}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-line/25 text-xs text-muted">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Name</th>
                    {showTeam && <th className="px-4 py-3 font-semibold">Team</th>}
                    <th className="px-4 py-3 font-semibold">Lessons</th>
                    <th className="px-4 py-3 font-semibold">Final</th>
                    <th className="px-4 py-3 font-semibold">Last active</th>
                    <th className="px-4 py-3 font-semibold">Due</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map((p) => {
                    const s = learnerStatus(p, totalLessons);
                    const why = attentionReason(facts(p), totalLessons, nowDate);
                    return (
                      <tr key={p.email} onClick={() => setOpen(p.email)} className="cursor-pointer border-b border-line/15 last:border-0 hover:bg-paper">
                        <td className="px-4 py-3">
                          <span className="flex items-center gap-3">
                            <Avatar name={p.name ?? p.email} />
                            <span className="min-w-0">
                              <button type="button" onClick={(e) => { e.stopPropagation(); setOpen(p.email); }} className="block whitespace-nowrap font-semibold hover:underline">{p.name ?? p.email.split("@")[0]}</button>
                              <span className="block max-w-56 truncate text-xs text-muted">{p.email}</span>
                            </span>
                          </span>
                        </td>
                        {showTeam && <td className="whitespace-nowrap px-4 py-3">{p.teamName ?? <span className="text-muted">—</span>}</td>}
                        <td className="px-4 py-3">{s === "not_assigned" ? <span className="text-muted">—</span> : <Bar value={p.lessonsPassed} total={totalLessons} tone={s === "completed" ? "#15803d" : "#1f4fd1"} />}</td>
                        <td className="whitespace-nowrap px-4 py-3 tabular-nums">{p.finalBest === null ? <span className="text-muted">—</span> : <span className={p.finalBest >= course.finalMark ? "font-semibold text-[#14532d]" : ""}>{p.finalBest}%</span>}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-muted">{s === "not_assigned" ? "—" : ago(p.lastActive, at)}</td>
                        <td className="whitespace-nowrap px-4 py-3">{p.requirement === "required" ? (p.dueOn ? dueText(p.dueOn) : "Required") : p.requirement === "recommended" ? <span className="text-muted">Recommended</span> : <span className="text-muted">—</span>}</td>
                        <td className="px-4 py-3">
                          <Badge tone={STATUS_TONE[s]}>{STATUS_LABEL[s]}</Badge>
                          {why && <span className={clsx("mt-1 block whitespace-nowrap text-xs font-semibold", why.urgency >= 3 ? "text-error" : "text-[#6b3300]")}>{why.reason}</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {pages > 1 && (
            <div className="flex items-center justify-end gap-2 border-t border-line/25 px-4 py-2 text-sm">
              <span className="mr-2 text-muted tabular-nums">Page {pageAt + 1} of {pages}</span>
              <button type="button" disabled={pageAt === 0} onClick={() => setPage(pageAt - 1)} className="rounded-md px-3 py-1.5 font-semibold hover:bg-paper disabled:opacity-40">Previous</button>
              <button type="button" disabled={pageAt >= pages - 1} onClick={() => setPage(pageAt + 1)} className="rounded-md px-3 py-1.5 font-semibold hover:bg-paper disabled:opacity-40">Next</button>
            </div>
          )}
        </div>
      </div>

      <Overlay open={hydrated && person !== null} onClose={() => setOpen(null)} title={person?.name ?? person?.email ?? ""} description={person ? [person.email, person.teamName].filter(Boolean).join(" · ") : undefined} kind="drawer" size="md">
        {person && (
          <PersonPanel
            key={person.email}
            slug={slug}
            course={course}
            person={person}
            totalLessons={totalLessons}
            now={nowDate}
            canAssign={canAssign}
            onAssign={() => { setOpen(null); setAssigning(person.email); }}
            onDone={(r) => { setResult(r); if (r.ok && r.message.startsWith("Removed")) setOpen(null); }}
          />
        )}
      </Overlay>

      {assign && (
        <Overlay open={assigning !== false} onClose={() => setAssigning(false)} title={`Assign ${course.title}`} kind="drawer" size="lg">
          {assigning !== false && (
            <AssignPanel key={assigning ?? "*"} slug={slug} people={assign.people} teams={assign.teams} canEveryone={assign.canEveryone} preselect={assigning} onDone={(r) => { setResult(r); setAssigning(false); }} onCancel={() => setAssigning(false)} />
          )}
        </Overlay>
      )}
    </>
  );
}

/** One person: where they stand, the actions, then every lesson module by module and the final. */
function PersonPanel({ slug, course, person: p, totalLessons, now, canAssign, onAssign, onDone }: {
  slug: string; course: TrackedCourse; person: CoursePerson; totalLessons: number; now: Date; canAssign: boolean;
  onAssign: () => void; onDone: (r: ConfirmResult) => void;
}) {
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState<null | "remind" | "save" | "remove">(null);
  const [msg, setMsg] = useState<ConfirmResult | null>(null);
  const [editing, setEditing] = useState(false);
  const [req, setReq] = useState(p.requirement ?? "required");
  const [due, setDue] = useState(p.dueOn ?? "");
  const [confirm, dialog] = useConfirm();
  const s = learnerStatus(p, totalLessons);
  const why = attentionReason({ ...p }, totalLessons, now);
  const checks = new Map(p.lessons.map((l) => [l.lesson, l]));
  const remindedToday = !!p.lastReminder && p.lastReminder.outcome === "sent" && now.getTime() - new Date(p.lastReminder.at).getTime() < 20 * 3600000;
  const pct = totalLessons ? Math.round((p.lessonsPassed / totalLessons) * 100) : 0;

  const run = (what: "remind" | "save" | "remove", action: () => Promise<ConfirmResult>) => {
    setBusy(what);
    setMsg(null);
    start(async () => {
      const r = await action();
      setMsg(r);
      setBusy(null);
      if (r.ok) { onDone(r); if (what === "save") setEditing(false); }
    });
  };

  if (!p.assigned) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm">{p.ownAccess ? `${p.name ?? p.email} has their own access to this course. Their progress stays private unless your company assigns it.` : `${p.name ?? p.email} doesn't have ${course.title} yet.`}</p>
        {canAssign && <div><button type="button" onClick={onAssign} className={BTN_PRIMARY}>Assign {course.title}</button></div>}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {dialog}
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={STATUS_TONE[s]}>{STATUS_LABEL[s]}</Badge>
        {why && <span className={clsx("text-sm font-semibold", why.urgency >= 3 ? "text-error" : "text-[#6b3300]")}>{why.reason}</span>}
      </div>

      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line/30 bg-line/20">
        <div className="bg-white p-4"><dt className="text-xs text-muted">Lessons</dt><dd className="mt-1 text-2xl font-semibold tabular-nums">{p.lessonsPassed}<span className="text-base text-muted">/{totalLessons}</span></dd>
          <dd aria-hidden="true" className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#e8e6e5]"><span className="block h-full rounded-full bg-[#1f4fd1]" style={{ width: `${pct}%` }} /></dd></div>
        <div className="bg-white p-4"><dt className="text-xs text-muted">Final assessment</dt><dd className="mt-1 text-2xl font-semibold tabular-nums">{p.finalBest === null ? "—" : `${p.finalBest}%`}</dd>
          <dd className="mt-1 text-xs text-muted">{p.finalBest === null ? `Not taken · ${course.finalMark}% to pass` : `${p.finalBest >= course.finalMark ? "Passed" : "Not passed yet"} · ${p.finalAttempts} of ${course.finalTries} tries`}</dd></div>
        <div className="bg-white p-4"><dt className="text-xs text-muted">Last active</dt><dd className="mt-1 text-sm font-semibold">{ago(p.lastActive, now.getTime())}</dd></div>
        <div className="bg-white p-4"><dt className="text-xs text-muted">Assigned</dt><dd className="mt-1 text-sm font-semibold">{p.assignedAt ? day(p.assignedAt) : "—"}</dd>
          <dd className="mt-0.5 text-xs text-muted">{p.requirement === "required" ? (p.dueOn ? `Required · due ${dueText(p.dueOn)}` : "Required · no due date") : "Recommended"}</dd></div>
      </dl>

      {canAssign && (
        <section className="flex flex-col gap-3 rounded-lg border border-line/30 p-4">
          {editing ? (
            <form className="flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); run("save", () => changeLearnerDue(slug, p.email, req, req === "required" ? due : "")); }}>
              <fieldset className="flex gap-4 text-sm">
                <legend className="sr-only">Required or recommended</legend>
                {(["required", "recommended"] as const).map((r) => (
                  <label key={r} className="flex items-center gap-2"><input type="radio" name="req" checked={req === r} onChange={() => setReq(r)} className="accent-[#1f4fd1]" />{r === "required" ? "Required" : "Recommended"}</label>
                ))}
              </fieldset>
              {req === "required" && (
                <label className="flex flex-col gap-1 text-sm font-semibold">Due date <span className="font-normal text-muted">(optional)</span>
                  <input type="date" value={due} onChange={(e) => setDue(e.target.value)} className="h-10 max-w-48 rounded-md border border-line/50 px-3 text-sm font-normal" />
                </label>
              )}
              <div className="flex gap-2">
                <button type="submit" disabled={pending} className={BTN_PRIMARY}>{busy === "save" ? "Saving…" : "Save"}</button>
                <button type="button" onClick={() => setEditing(false)} className="text-sm font-semibold text-muted hover:text-ink">Cancel</button>
              </div>
              <p className="text-xs text-muted">Only {p.name ?? "this person"} changes; anyone assigned with them keeps their dates.</p>
            </form>
          ) : (
            <div className="flex flex-wrap gap-2">
              <button type="button" disabled={pending || remindedToday || s === "completed"} onClick={() => run("remind", () => sendUpskillReminder(slug, p.email))} className={BTN_PRIMARY}>
                {busy === "remind" ? "Sending…" : remindedToday ? "Reminded today" : "Send a reminder"}
              </button>
              <button type="button" disabled={pending} onClick={() => setEditing(true)} className={BTN_SECONDARY}>Change due date</button>
              <button
                type="button"
                disabled={pending}
                onClick={async () => { if (await confirm({ title: `Remove ${course.title} from ${p.name ?? p.email}?`, body: "They can no longer open the course. What they did is kept.", confirmLabel: "Remove", cancelLabel: "Keep it" })) run("remove", () => removeAssignment(slug, p.email)); }}
                className="inline-flex min-h-10 items-center rounded-md px-3 text-sm font-semibold text-error hover:bg-error-tint disabled:opacity-50"
              >
                {busy === "remove" ? "Removing…" : "Remove"}
              </button>
            </div>
          )}
          {!editing && p.lastReminder && <p className="text-xs text-muted">Last reminder {p.lastReminder.outcome === "sent" ? "sent" : "failed"} {ago(p.lastReminder.at, now.getTime()).toLowerCase()} by {p.lastReminder.by}.</p>}
          {msg && <p role={msg.ok ? "status" : "alert"} className={clsx("text-sm font-semibold", msg.ok ? "text-[#14532d]" : "text-error")}>{msg.message}</p>}
        </section>
      )}

      <section aria-label="Lessons" className="flex flex-col gap-4">
        {course.modules.map((m) => {
          const done = m.lessons.filter((l) => checks.get(l.id)?.passedAt).length;
          return (
            <div key={m.title} className="overflow-hidden rounded-lg border border-line/30">
              <div className="flex items-center justify-between gap-3 bg-paper px-4 py-2.5">
                <h3 className="text-sm font-semibold">{m.title}</h3>
                <span className="text-xs tabular-nums text-muted">{done}/{m.lessons.length}</span>
              </div>
              <ol>
                {m.lessons.map((l) => {
                  const c = checks.get(l.id);
                  return (
                    <li key={l.id} className="flex items-center gap-3 border-t border-line/15 px-4 py-2 text-sm">
                      <span aria-hidden="true" className={clsx("flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold", c?.passedAt ? "bg-[#15803d] text-white" : c ? "bg-[#fdf1e7] text-[#6b3300]" : "border border-line/50 text-muted")}>{c?.passedAt ? "✓" : l.no}</span>
                      <span className="min-w-0 flex-1 truncate" title={l.title}>{l.title}</span>
                      <span className="shrink-0 text-xs tabular-nums text-muted">
                        {c ? <>{c.bestScore}%{c.attempts > 1 && ` · ${c.attempts} tries`}{!c.passedAt && <span className="text-[#6b3300]"> · not passed</span>}</> : "—"}
                      </span>
                      <span className="sr-only">{c?.passedAt ? "passed" : c ? "tried, not passed" : "not started"}</span>
                    </li>
                  );
                })}
              </ol>
            </div>
          );
        })}
      </section>
    </div>
  );
}

/** The page's one primary action: Assign course, in a side panel. */
export function AssignCourseButton({ slug, course, people, teams, canEveryone, label = "Assign course" }: {
  slug: string; course: string; people: PanelPerson[]; teams: { id: string; name: string }[]; canEveryone: boolean; label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<ConfirmResult | null>(null);
  return (
    <>
      <button type="button" onClick={() => { setResult(null); setOpen(true); }} className={BTN_PRIMARY}>+ {label}</button>
      {result && <p role={result.ok ? "status" : "alert"} className={clsx("basis-full text-sm font-semibold", result.ok ? "text-[#14532d]" : "text-error")}>{result.message}</p>}
      <Overlay open={open} onClose={() => setOpen(false)} title={`Assign ${course}`} kind="drawer" size="lg">
        {open && <AssignPanel slug={slug} people={people} teams={teams} canEveryone={canEveryone} preselect={null} onDone={(r) => { setResult(r); setOpen(false); }} onCancel={() => setOpen(false)} />}
      </Overlay>
    </>
  );
}
