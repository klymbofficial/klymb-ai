import "server-only";
import { getAdmin } from "@/lib/admin/auth";
import { db } from "@/lib/db/client";

export interface WebinarRegistration {
  id: string;
  created_at: string;
  name: string;
  email: string;
  phone: string;
  role: "student" | "working";
  org: string | null;
  question: string | null;
  confirmation_sent_at: string | null;
}

/** Everyone registered for one webinar, newest first. Null when the table isn't there yet (migration 0042 not run). */
export async function getWebinarRegistrations(webinar: string): Promise<WebinarRegistration[] | null> {
  // The connection can read the whole course schema, so authorisation is checked here.
  if (!(await getAdmin())) return [];
  const sql = db();
  if (!sql) return [];
  const { data, error } = await sql.rows<WebinarRegistration>`
    select id, created_at, name, email, phone, role, org, question, confirmation_sent_at
      from course.webinar_registrations
     where webinar = ${webinar}
     order by created_at desc
     limit 5000
  `;
  if (error) {
    console.error("webinar registrations read failed:", error.message);
    return null;
  }
  return data ?? [];
}
