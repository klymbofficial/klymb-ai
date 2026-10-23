import "server-only";
import { type Db } from "@/lib/db/client";
import { commitDays, mainRepo } from "@/lib/learner/github";

/**
 * Keeps course.learners.commit_days current, off the request path.
 *
 * The admin learner table shows how many distinct days each learner pushed
 * work, for the "commits on 20+ days" rule. That used to be counted while the
 * page rendered: one commitDays() per learner, each making up to three GitHub
 * requests. At a thousand learners a single page load is three thousand
 * requests against a 5,000/hour budget — a budget shared with checkFreshPush,
 * which learners need in order to submit at all. So the page would get slower
 * and slower and then start locking learners out of submitting.
 *
 * Now the hourly cron refreshes a bounded batch, stalest first, and the page
 * just reads the column.
 */

/**
 * Learners refreshed per run. Each costs up to three GitHub requests, so this
 * is ~450/hour against a 5,000/hour budget, leaving most of it for learners
 * submitting work. Raise it if the numbers feel too stale: at 1,000 learners
 * this cycles through everyone in about seven hours, at 10,000 in about three
 * days. These numbers only drive an admin column, so staleness is cheap.
 */
export const COMMIT_BATCH = 150;

export interface CommitRefresh {
  checked: number;
  updated: number;
  failed: number;
}

/**
 * Re-counts commit days for the learners checked longest ago.
 *
 * A learner with no submissions has no repository to look at, so they are
 * skipped — but their timestamp is still moved forward, otherwise they would
 * sit at the front of the queue for ever and starve everyone behind them.
 */
export async function refreshCommitDays(sql: Db, batch = COMMIT_BATCH): Promise<CommitRefresh> {
  const { data: due } = await sql.rows<{ id: string; github_username: string; urls: (string | null)[] }>`
    select l.id,
           l.github_username,
           coalesce(array_agg(d.deliverable_url) filter (where d.deliverable_url is not null), '{}') as urls
      from course.learners l
      left join course.day_submissions d on d.learner_id = l.id
     where l.github_username is not null
       and l.status = 'active'
     group by l.id, l.github_username
     order by l.commits_checked_at nulls first
     limit ${batch}
  `;

  const result: CommitRefresh = { checked: 0, updated: 0, failed: 0 };
  if (!due?.length) return result;

  for (const learner of due) {
    result.checked += 1;
    const repo = mainRepo(learner.urls);
    // No repository to count yet: stamp them anyway so the queue moves on.
    if (!repo) {
      await sql.run`
        update course.learners
           set commit_repo = null, commit_days = null, commits_checked_at = now()
         where id = ${learner.id}
      `;
      continue;
    }

    const days = await commitDays(repo.owner, repo.repo, learner.github_username);
    // null means GitHub would not answer (private, renamed, rate-limited).
    // Keep the last known number rather than replacing it with a wrong one,
    // and still stamp the row so one broken repo cannot block the queue.
    const { error } = days === null
      ? await sql.run`
          update course.learners
             set commit_repo = ${`${repo.owner}/${repo.repo}`}, commits_checked_at = now()
           where id = ${learner.id}
        `
      : await sql.run`
          update course.learners
             set commit_repo = ${`${repo.owner}/${repo.repo}`},
                 commit_days = ${days},
                 commits_checked_at = now()
           where id = ${learner.id}
        `;

    if (error) result.failed += 1;
    else if (days === null) result.failed += 1;
    else result.updated += 1;
  }

  return result;
}
