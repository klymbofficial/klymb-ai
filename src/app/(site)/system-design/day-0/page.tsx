import { redirect } from "next/navigation";

/** Day 0 now lives in the course app; links already shared keep working. */
export default function SystemDesignDayZero() {
  redirect("/learn/system-design?lesson=0-0");
}
