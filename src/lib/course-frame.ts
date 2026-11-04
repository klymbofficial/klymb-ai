import type { Course } from "@/data/courses/types";
import type { FrameModule } from "@/components/course/course-frame";

/** A course's modules as the sidebar lists them, each with its numbered sections. */
export function frameModules(course: Course): FrameModule[] {
  return course.modules.map(({ slug, number, title, minutes, blocks }) => ({
    slug,
    number,
    title,
    minutes,
    sections: blocks.flatMap((b) => (b.type === "h2" ? [b] : [])).map((b, i) => ({ id: b.id, text: `${number}.${i + 1} ${b.text}` })),
  }));
}
