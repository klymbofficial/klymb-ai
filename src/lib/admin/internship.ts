import "server-only";
import { getSalesAdmin } from "@/lib/admin/auth";
import { db } from "@/lib/db/client";
import type { Hours, InternStatus } from "@/lib/internship";

export interface InternApplication {
  id: string;
  created_at: string;
  name: string;
  email: string;
  phone: string;
  city: string | null;
  role: "student" | "working";
  org: string | null;
  linkedin: string | null;
  instagram: string | null;
  hours: Hours;
  sales_experience: string | null;
  why: string;
  status: InternStatus;
  status_changed_at: string | null;
  status_by: string | null;
  call_note: string | null;
}

/** One intake's applications, newest first. Null when the table isn't there (migration 0044 not run). Owners and sales managers only. */
export async function getInternApplications(batch: string): Promise<InternApplication[] | null> {
  if (!(await getSalesAdmin())) return [];
  const sql = db();
  if (!sql) return [];
  const { data, error } = await sql.rows<InternApplication>`
    select id, created_at, name, email, phone, city, role, org, linkedin, instagram, hours, sales_experience, why,
           status, status_changed_at, status_by, call_note
      from course.internship_applications
     where batch = ${batch}
     order by created_at desc
     limit 5000
  `;
  if (error) {
    console.error("internship applications read failed:", error.code, error.message);
    return null;
  }
  return data ?? [];
}
