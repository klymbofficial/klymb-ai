import "server-only";
import type { StatsRow } from "@/lib/company/question-stats";
import type { Db } from "@/lib/db/client";

const UNDEFINED = new Set(["42P01", "42703"]);

/**
 * Every automatic mark this company's candidates got on copies of one
 * library question (matched by the source id frozen in each test version).
 * Never another company's attempts. Null on a database error.
 */
export async function questionStatsRows(sql: Db, companyId: string, questionId: string): Promise<StatsRow[] | null> {
  const { data, error } = await sql.rows<{ month: string; points: number; max: number }>`
    select to_char(s.submitted_at at time zone 'UTC', 'YYYY-MM') as month, (m ->> 'points')::int as points, (m ->> 'max')::int as max
      from course.attempt_submissions s
      join course.candidate_attempts a on a.id = s.attempt_id and a.company_id = s.company_id
      join course.assessment_versions v on v.id = a.version_id
      cross join lateral jsonb_array_elements(case when jsonb_typeof(v.questions) = 'array' then v.questions else '[]'::jsonb end) with ordinality as q(item, n)
      cross join lateral jsonb_array_elements(case when jsonb_typeof(s.auto_scores) = 'array' then s.auto_scores else '[]'::jsonb end) as m
     where s.company_id = ${companyId}::uuid and q.item ->> 'source' = ${questionId} and (m ->> 'question_no')::int = q.n
  `;
  if (error) {
    if (UNDEFINED.has(error.code ?? "")) return [];
    console.error("question stats failed:", error.code, error.message);
    return null;
  }
  return data ?? [];
}
