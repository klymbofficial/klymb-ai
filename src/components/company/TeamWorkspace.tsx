"use client";

import clsx from "clsx";
import { useState } from "react";
import { removePerson, resendInvite, type PeopleResult } from "@/app/org/[slug]/(workspace)/people/actions";
import { AddOne, Note, RemovedList, RolesEditor, UploadCsv } from "@/components/company/MemberForms";
import { Badge, BTN_PRIMARY, BTN_SECONDARY, OrgPageHead, PANEL, SearchBox } from "@/components/company/HiringParts";
import { OrgIcon } from "@/components/company/OrgIcons";
import { Overlay, useConfirm } from "@/components/company/Overlay";
import { CreateTeam, LeadForm, MoveOne } from "@/components/company/TeamForms";
import { ROLE_LABEL } from "@/lib/company/access";
import type { CompanyPeople, PersonRow, TeamRow } from "@/lib/company/people-data";

const day = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
const PAGE = 30;

/** Everyone in a team: the card's number and the drawer's list. */
const inTeam = (people: PersonRow[], id: string) => people.filter((p) => p.team_id === id);

/**
 * Everyone inside the company, laid out like HackerEarth's Team Management:
 * the team cards first (click one to see its people and choose its lead),
 * then one table of members with a search box and a + button. Clicking a
 * member opens them in a drawer to change what they do, move team, resend
 * the invite or remove them. Adding (one person or a CSV) and creating a team
 * open in overlays, so the page itself stays a list.
 */
export function TeamWorkspace({ slug, me, data, addAdmin }: { slug: string; me: string; data: CompanyPeople; addAdmin: boolean }) {
  const [adding, setAdding] = useState<null | "employee" | "admin">(addAdmin ? "admin" : null);
  const [creating, setCreating] = useState(false);
  const [teamId, setTeamId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<string | "all">("all");
  const [page, setPage] = useState(0);

  const used = data.active.length;
  const free = Math.max(0, data.seatCount - used);
  const team = data.teams.find((t) => t.id === teamId) ?? null;
  // Looked up again on every render, so a saved change shows straight away.
  const person = data.active.find((p) => p.email === email) ?? null;

  const q = query.trim().toLowerCase();
  const matching = data.active.filter((p) =>
    (filter === "all" || (filter === "none" ? !p.team_id : p.team_id === filter)) &&
    (!q || p.email.includes(q) || (p.name ?? "").toLowerCase().includes(q)),
  );
  const pages = Math.max(1, Math.ceil(matching.length / PAGE));
  const at = Math.min(page, pages - 1);
  const shown = matching.slice(at * PAGE, at * PAGE + PAGE);

  return (
    <>
      <OrgPageHead
        title="Team"
        meta={<span className="nums">{used} of {data.seatCount} seats used · {free} free</span>}
        actions={<button type="button" onClick={() => setCreating(true)} className={BTN_PRIMARY}>Create team</button>}
      />

      <p className="mb-3 text-sm text-muted nums">
        Teams ({data.teams.length}) <span aria-hidden="true" className="px-1.5 text-line">|</span> Members ({used})
      </p>
      {data.teams.length === 0 ? (
        <div className={clsx(PANEL, "mb-8 flex flex-wrap items-center justify-between gap-3 p-5")}>
          <p className="text-sm text-muted">No teams yet. Group people into teams to see their Upskill progress together.</p>
          <button type="button" onClick={() => setCreating(true)} className={BTN_SECONDARY}>Create team</button>
        </div>
      ) : (
        <ul className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {data.teams.map((t) => (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => setTeamId(t.id)}
                className={clsx(PANEL, "flex h-full w-full flex-col items-start gap-1.5 p-5 text-left shadow-sm transition-colors hover:border-ink")}
              >
                <span className="text-lg font-semibold">{t.name}</span>
                <span className="text-sm text-muted nums">{t.members} {t.members === 1 ? "member" : "members"}</span>
                <span className="text-xs text-muted">Lead: {t.lead_name ?? t.lead_email ?? "none yet"}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <h2 className="mb-3 text-lg font-semibold">Details</h2>
      <section aria-labelledby="members-title" className={PANEL}>
        <div className="flex flex-wrap items-center gap-3 border-b border-line/25 px-4 py-3">
          <h3 id="members-title" className="mr-auto text-base font-semibold nums">Members ({matching.length})</h3>
          <SearchBox label="Search members" placeholder="Search by name or email" value={query} onChange={(v) => { setQuery(v); setPage(0); }} />
          {data.teams.length > 0 && (
            <label className="flex items-center">
              <span className="sr-only">Team</span>
              <select value={filter} onChange={(e) => { setFilter(e.target.value); setPage(0); }} className="min-h-10 rounded-md border border-line/50 bg-white px-3 text-sm">
                <option value="all">All teams</option>
                {data.teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                <option value="none">No team</option>
              </select>
            </label>
          )}
          <button type="button" onClick={() => setAdding("employee")} aria-label="Add members" title="Add members" className="flex h-10 w-10 items-center justify-center rounded-md text-[#1f4fd1] hover:bg-paper">
            <OrgIcon name="plus" size={22} />
          </button>
        </div>
        {shown.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted">{used === 0 ? "Nobody yet. Press + to add someone." : "Nobody matches that search."}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line/25 text-xs text-muted">
                <tr>
                  <th className="w-12 px-4 py-3 font-semibold">#</th>
                  <th className="px-4 py-3 font-semibold">Name</th>
                  <th className="px-4 py-3 font-semibold">Email</th>
                  <th className="px-4 py-3 font-semibold">Team</th>
                  <th className="px-4 py-3 font-semibold">Added</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((p, i) => (
                  <tr key={p.email} onClick={() => setEmail(p.email)} className="cursor-pointer border-b border-line/15 last:border-0 hover:bg-paper">
                    <td className="px-4 py-3 text-muted nums">{String(at * PAGE + i + 1).padStart(2, "0")}</td>
                    <td className="px-4 py-3">
                      <span className="flex flex-wrap items-center gap-2">
                        <Avatar person={p} />
                        <button type="button" onClick={(e) => { e.stopPropagation(); setEmail(p.email); }} className="whitespace-nowrap font-semibold hover:underline">
                          {p.name ?? p.email.split("@")[0]}
                        </button>
                        {p.email === me && <Badge tone="grey">You</Badge>}
                        {p.roles.filter((r) => r !== "employee").map((r) => <Badge key={r} tone={r === "admin" ? "green" : "blue"}>{ROLE_LABEL[r]}</Badge>)}
                      </span>
                    </td>
                    <td className="max-w-64 truncate px-4 py-3" title={p.email}>{p.email}</td>
                    <td className="px-4 py-3">{p.team_name ?? <span className="text-muted">—</span>}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted nums">{day(p.added_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {pages > 1 && (
          <div className="flex items-center justify-end gap-2 border-t border-line/25 px-4 py-2 text-sm">
            <span className="mr-2 text-muted nums">Page {at + 1} of {pages}</span>
            <button type="button" disabled={at === 0} onClick={() => setPage(at - 1)} className="rounded-md px-3 py-1.5 font-semibold hover:bg-paper disabled:opacity-40">Previous</button>
            <button type="button" disabled={at >= pages - 1} onClick={() => setPage(at + 1)} className="rounded-md px-3 py-1.5 font-semibold hover:bg-paper disabled:opacity-40">Next</button>
          </div>
        )}
      </section>

      <div className="mt-8"><RemovedList people={data.removed} /></div>

      <Overlay open={creating} onClose={() => setCreating(false)} title="Create team" size="sm">
        <CreateTeam slug={slug} onDone={() => setCreating(false)} />
      </Overlay>

      <Overlay open={adding !== null} onClose={() => setAdding(null)} title={adding === "admin" ? "Add admin" : "Add members"} description={`${free} of ${data.seatCount} seats free.`} kind="drawer" size="md">
        {adding && <AddPanel slug={slug} teams={data.teams} free={free} role={adding} />}
      </Overlay>

      <Overlay open={team !== null} onClose={() => setTeamId(null)} title={team?.name ?? ""} description={team ? `${team.members} ${team.members === 1 ? "member" : "members"}` : undefined} kind="drawer" size="md">
        {team && <TeamPanel slug={slug} team={team} people={data.active} onOpen={(e) => { setTeamId(null); setEmail(e); }} />}
      </Overlay>

      <Overlay open={person !== null} onClose={() => setEmail(null)} title={person?.name ?? person?.email ?? ""} description={person?.name ? person.email : undefined} kind="drawer" size="md">
        {person && <PersonPanel slug={slug} me={me} person={person} teams={data.teams} onRemoved={() => setEmail(null)} />}
      </Overlay>
    </>
  );
}

function Avatar({ person }: { person: PersonRow }) {
  const letter = (person.name ?? person.email).trim()[0]?.toUpperCase() ?? "?";
  return <span aria-hidden="true" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ink text-xs font-bold text-paper">{letter}</span>;
}

/** Add one person or a CSV, in tabs. */
function AddPanel({ slug, teams, free, role }: { slug: string; teams: TeamRow[]; free: number; role: "employee" | "admin" }) {
  const [tab, setTab] = useState<"one" | "csv">("one");
  return (
    <div className="flex flex-col gap-5">
      <div role="tablist" aria-label="How to add" className="flex gap-1 border-b border-line/25">
        {([["one", "Add one person"], ["csv", "Upload a CSV"]] as const).map(([k, l]) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={clsx("-mb-px border-b-2 px-3 py-2 text-sm font-semibold", tab === k ? "border-red-strong text-ink" : "border-transparent text-muted hover:text-ink")}>{l}</button>
        ))}
      </div>
      {tab === "one" ? <AddOne slug={slug} teams={teams.map((t) => t.name)} free={free} initialRole={role} /> : <UploadCsv slug={slug} free={free} />}
    </div>
  );
}

/** One team: its lead and its people. Clicking a person opens them. */
function TeamPanel({ slug, team, people, onOpen }: { slug: string; team: TeamRow; people: PersonRow[]; onOpen: (email: string) => void }) {
  const members = inTeam(people, team.id);
  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold">Lead</h3>
        <p className="text-sm">{team.lead_email ? <strong>{team.lead_name ?? team.lead_email}</strong> : <span className="text-muted">None yet</span>}</p>
        <LeadForm slug={slug} team={team} people={people} />
      </section>
      <section className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold nums">Members ({members.length})</h3>
        {members.length === 0 ? <p className="text-sm text-muted">Nobody in this team yet. Open a member to move them here.</p> : (
          <ul className="divide-y divide-line/15 rounded-md border border-line/25">
            {members.map((p) => (
              <li key={p.email}>
                <button type="button" onClick={() => onOpen(p.email)} className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm hover:bg-paper">
                  <Avatar person={p} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{p.name ?? p.email}</span>
                    {p.name && <span className="block truncate text-xs text-muted">{p.email}</span>}
                  </span>
                  {p.lead_team_id === team.id && <Badge tone="blue">Lead</Badge>}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

/** One member: what they do, their team, and resend or remove. */
function PersonPanel({ slug, me, person, teams, onRemoved }: { slug: string; me: string; person: PersonRow; teams: TeamRow[]; onRemoved: () => void }) {
  const [busy, setBusy] = useState<null | "remove" | "resend">(null);
  const [result, setResult] = useState<PeopleResult | null>(null);
  const [confirm, dialog] = useConfirm();
  const self = person.email === me;

  async function resend() {
    setBusy("resend");
    setResult(null);
    setResult(await resendInvite(slug, person.email));
    setBusy(null);
  }
  async function remove() {
    const who = person.name ? `${person.name} (${person.email})` : person.email;
    if (!(await confirm({ title: `Remove ${who}?`, body: "Their access ends now and their seat frees up. Their record is kept, and you can add them back later.", confirmLabel: "Remove", cancelLabel: "Keep them" }))) return;
    setBusy("remove");
    setResult(null);
    const r = await removePerson(slug, person.email);
    setBusy(null);
    if (r.ok) onRemoved(); else setResult(r);
  }

  return (
    <div className="flex flex-col gap-6">
      {dialog}
      <dl className="grid grid-cols-[6rem_1fr] gap-y-2 text-sm">
        <dt className="text-muted">Team</dt><dd>{person.team_name ?? "No team"}</dd>
        <dt className="text-muted">Added</dt><dd className="nums">{day(person.added_at)}</dd>
      </dl>
      <section className="border-t border-line/20 pt-5">
        <RolesEditor key={person.roles.join()} slug={slug} person={person} onDone={setResult} />
      </section>
      <section className="border-t border-line/20 pt-5">
        <h3 className="mb-3 text-sm font-semibold">Move to another team</h3>
        <MoveOne key={person.team_id ?? "none"} slug={slug} person={person} teams={teams} />
      </section>
      {self ? (
        <p className="border-t border-line/20 pt-5 text-xs text-muted">This is you. Another admin can remove you or resend your invite.</p>
      ) : (
        <section className="flex flex-wrap gap-2 border-t border-line/20 pt-5">
          <button type="button" onClick={resend} disabled={busy !== null} className={BTN_SECONDARY}>{busy === "resend" ? "Sending…" : "Resend invite"}</button>
          <button type="button" onClick={remove} disabled={busy !== null} className="inline-flex min-h-10 items-center rounded-md border-2 border-error px-4 text-sm font-bold text-error hover:bg-error-tint disabled:opacity-50">{busy === "remove" ? "Removing…" : "Remove"}</button>
        </section>
      )}
      <Note result={result} />
    </div>
  );
}
