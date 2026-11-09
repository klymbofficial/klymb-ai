/** Pure and client-safe: the one rule the bulk button and its confirmation share. */

/** Active members with neither an assignment nor a course of their own: who "assign to everyone" reaches. */
export function unassignedCount(rows: { assigned: boolean; ownAccess: boolean }[]) {
  return rows.filter((r) => !r.assigned && !r.ownAccess).length;
}
