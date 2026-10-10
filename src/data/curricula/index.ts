import type { CurriculumDay, CurriculumModule } from "@/types/curriculum";
import type { TrackSlug } from "@/types/program";
import { pmCurriculum, pmModules } from "@/data/pm-curriculum";
import { aiPmCurriculum, aiPmModules } from "./ai-product-manager";
import { juniorDevCurriculum, juniorDevModules } from "./junior-developer";
import { l1l2Curriculum, l1l2Modules } from "./l1-l2-support";
import { qaCurriculum, qaModules } from "./qa-engineer";
import { reportingAnalystCurriculum, reportingAnalystModules } from "./reporting-analyst";

/** The 30 days and four modules behind each track's learner app. */
export const curricula: Record<TrackSlug, { days: CurriculumDay[]; modules: CurriculumModule[] }> = {
  "project-manager": { days: pmCurriculum, modules: pmModules },
  "l1-l2-support": { days: l1l2Curriculum, modules: l1l2Modules },
  "qa-engineer": { days: qaCurriculum, modules: qaModules },
  "junior-developer": { days: juniorDevCurriculum, modules: juniorDevModules },
  "reporting-analyst": { days: reportingAnalystCurriculum, modules: reportingAnalystModules },
  "ai-product-manager": { days: aiPmCurriculum, modules: aiPmModules },
};

export function getCurriculum(track: string) {
  return curricula[track as TrackSlug] ?? null;
}

export function getCurriculumDay(track: string, day: number): CurriculumDay | undefined {
  return getCurriculum(track)?.days.find((d) => d.day === day);
}
