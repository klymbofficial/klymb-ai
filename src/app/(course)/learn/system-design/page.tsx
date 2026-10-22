import type { Metadata, Viewport } from "next";
import { CourseApp } from "@/components/course-app/CourseApp";

export const metadata: Metadata = {
  title: "System Design course",
  description: "Short video lessons, in-video quick checks, and a pre- and post-assessment that show what you learned.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: "#f3f2f2", viewportFit: "cover" };

export default function SystemDesignCoursePage() {
  return <CourseApp />;
}
