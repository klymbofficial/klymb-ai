import type { Metadata } from "next";
import { DayLesson } from "@/components/lesson/DayLesson";
import { dayOne } from "@/data/system-design/day-1";

export const metadata: Metadata = {
  title: "Day 1 · Big Billion Day | System Design in 21 Days",
  description: "Flipkart's first Big Billion Day buckled. How would you prepare for the next one? Answer first, then watch what really happened.",
};

export default function SystemDesignDayOne() {
  return <DayLesson day={dayOne} />;
}
