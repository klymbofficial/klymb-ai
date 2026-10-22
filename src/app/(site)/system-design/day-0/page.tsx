import type { Metadata } from "next";
import { DayLesson } from "@/components/lesson/DayLesson";
import { dayZero } from "@/data/system-design/day-0";

export const metadata: Metadata = {
  title: "Day 0 · Start here | System Design in 21 Days",
  description: "What system design is, explained with Raju's dhaba: servers, load balancers, caches, databases and queues, in about 12 minutes on your phone.",
};

export default function SystemDesignDayZero() {
  return <DayLesson day={dayZero} />;
}
