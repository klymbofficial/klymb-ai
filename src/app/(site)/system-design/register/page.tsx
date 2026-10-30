import { redirect } from "next/navigation";

/** Pre-registration lives on the course's own link. */
export default function SystemDesignRegisterPage() {
  redirect("/learn/system-design");
}
