import type { Metadata } from "next";
import { CourseLibrary } from "@/components/catalog/CourseLibrary";

export const metadata: Metadata = {
  title: "Courses",
  description: "Every Klymb.ai course, by role and by industry, with what you can enrol in today and what is not available yet.",
};

export default function CoursesPage() {
  return <CourseLibrary />;
}
