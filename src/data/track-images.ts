import type { StaticImageData } from "next/image";
import type { TrackSlug } from "@/types/program";
import juniorDeveloper from "@/assets/tracks/junior-developer.jpg";
import l1l2Support from "@/assets/tracks/l1-l2-support.jpg";
import projectManager from "@/assets/tracks/project-manager.jpg";
import qaEngineer from "@/assets/tracks/qa-engineer.jpg";
import reportingAnalyst from "@/assets/tracks/reporting-analyst.jpg";
import aiProductManager from "@/assets/track-page/presenting.jpg";
// The challenges' own cover art.
import claudeCover from "@/assets/challenges/cover-claude.webp";
import aiCover from "@/assets/challenges/cover-ai.webp";
import seCover from "@/assets/challenges/cover-se.webp";
import dsCover from "@/assets/challenges/cover-ds.webp";

/**
 * One photograph per track, used on its card and its page. Sources and the
 * licence are in src/assets/tracks/CREDITS.md. Typed by slug, so adding a
 * track without a photo is a compile error rather than a blank card.
 */
export const trackImages: Record<TrackSlug, { src: StaticImageData; alt: string }> = {
  "qa-engineer": { src: qaEngineer, alt: "Two people reviewing code together at their monitors" },
  "l1-l2-support": { src: l1l2Support, alt: "Support agents wearing headsets at their desks" },
  "project-manager": { src: projectManager, alt: "A hand arranging cards on a project planning board" },
  "junior-developer": { src: juniorDeveloper, alt: "Colour-highlighted source code on a screen" },
  "reporting-analyst": { src: reportingAnalyst, alt: "An analytics dashboard of charts on a laptop" },
  "ai-product-manager": { src: aiProductManager, alt: "A product lead presenting to a team" },
  claude: { src: claudeCover, alt: "Cover art for the Claude Challenge" },
  "artificial-intelligence": { src: aiCover, alt: "Cover art for the Artificial Intelligence challenge" },
  "software-engineering": { src: seCover, alt: "Cover art for the Software Engineering challenge" },
  "data-science": { src: dsCover, alt: "Cover art for the Data Science challenge" },
};
