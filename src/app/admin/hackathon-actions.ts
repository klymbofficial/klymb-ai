"use server";

import { revalidatePath } from "next/cache";
import { getAdmin } from "@/lib/admin/auth";
import { logAdmin } from "@/lib/admin/audit";
import { saveResults, saveScore } from "@/lib/admin/hackathon";
import { parseMark } from "@/lib/hackathon-validate";

export type AdminResult = { ok: true } | { ok: false; message: string };

/** One judge's marks for one team, out of 10 on each criterion. */
export async function scoreHackathonTeam(teamId: string, form: FormData): Promise<AdminResult> {
  const admin = await getAdmin();
  if (!admin) return { ok: false, message: "Not authorised." };
  const product = parseMark(form.get("product")), prompting = parseMark(form.get("prompting")), polish = parseMark(form.get("polish"));
  if (product == null || prompting == null || polish == null) return { ok: false, message: "Give each criterion a whole number from 0 to 10." };
  const comment = typeof form.get("comment") === "string" ? String(form.get("comment")).trim().slice(0, 1000) : "";
  if (!(await saveScore(admin.email, teamId, { product, prompting, polish, comment }))) return { ok: false, message: "That could not be saved." };
  await logAdmin(admin, "hackathon.score", teamId, { product, prompting, polish });
  revalidatePath("/admin/hackathon");
  return { ok: true };
}

/** The winners, as a draft or published on /hackathons. */
export async function setHackathonResults(form: FormData): Promise<AdminResult> {
  const admin = await getAdmin();
  if (!admin) return { ok: false, message: "Not authorised." };
  const places = [1, 2, 3].flatMap((place) => {
    const teamId = form.get(`team-${place}`);
    const title = String(form.get(`title-${place}`) ?? "").trim().slice(0, 60) || ["Winner", "Runner-up", "Third place"][place - 1];
    return typeof teamId === "string" && teamId ? [{ place, teamId, title }] : [];
  });
  if (new Set(places.map((p) => p.teamId)).size !== places.length) return { ok: false, message: "A team can only take one place." };
  const publish = form.get("publish") === "1";
  if (!(await saveResults(places, publish))) return { ok: false, message: "That could not be saved." };
  await logAdmin(admin, "hackathon.results", null, { places: places.map((p) => p.teamId), publish });
  revalidatePath("/admin/hackathon");
  revalidatePath("/hackathons");
  return { ok: true };
}
