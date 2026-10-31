import { redirect } from "next/navigation";

/** Day 0 is the free lesson; Day 1 onwards is in the full course. */
export default function SystemDesignDayOne() {
  redirect("/system-design");
}
