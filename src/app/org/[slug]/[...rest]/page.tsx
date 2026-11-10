import { notFound } from "next/navigation";

/**
 * Any mistyped address under /org/<company>/…. Without this the visitor would
 * get the site-wide 404, which is written for learners; this one shows
 * /org/not-found, written for company members.
 */
export default function UnknownOrgPage() {
  notFound();
}
