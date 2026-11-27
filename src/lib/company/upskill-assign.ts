import "server-only";
import type { CompanyMember } from "@/lib/company/access";
import type { PanelPerson } from "@/components/company/AssignPanel";
import { listAssignments, loadAssignPeople, loadTeams } from "@/lib/company/assign-data";
import { assignerFor } from "@/lib/company/auth";
import type { Db } from "@/lib/db/client";
import { SD_COURSE } from "@/lib/sd-offer";

/**
 * What the Assign panel needs, for whoever may assign here (an admin for the
 * company, a lead for their team); null for anyone else. Undefined when it
 * can't be read.
 */
export async function assignContext(sql: Db, member: CompanyMember) {
  const assigner = await assignerFor(member.companySlug);
  if (!assigner) return null;
  const teamScope = assigner.scope.kind === "team" ? assigner.scope.teamId : null;
  const [people, teams, history] = await Promise.all([
    loadAssignPeople(sql, member.companyId, SD_COURSE),
    loadTeams(sql, member.companyId),
    listAssignments(sql, member.companyId, teamScope),
  ]);
  if (!people || !teams || !history) return undefined;
  const teamName = new Map(teams.map((t) => [t.id, t.name]));
  const panelPeople: PanelPerson[] = people
    .filter((p) => !teamScope || p.teamId === teamScope)
    .map((p) => ({ email: p.email, name: p.name, teamName: p.teamId ? (teamName.get(p.teamId) ?? null) : null, has: p.assigned || p.ownAccess }));
  return {
    people: panelPeople,
    teams: teams.filter((t) => !teamScope || t.id === teamScope),
    canEveryone: assigner.scope.kind === "company",
    history,
  };
}
