import { redirect } from "next/navigation";

/** Day 1 now lives in the course app; links already shared keep working. */
export default function SystemDesignDayOne() {
  redirect("/learn/system-design?lesson=1-0");
}
