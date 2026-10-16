import "server-only";

/**
 * Reads learners' public GitHub activity, to confirm a submission is a real,
 * new push by the learner. Uses GITHUB_TOKEN (read-only, public repos) when
 * set: 5,000 calls an hour instead of 60. Every failure on GitHub's side
 * (down, slow, rate-limited) answers "unknown", so a learner is never
 * blocked by an outage; only a clear "no" blocks.
 */

const API = "https://api.github.com";
const GRACE_MS = 12 * 3600 * 1000;

async function gh<T>(path: string, revalidate = 0): Promise<{ ok: true; data: T } | { ok: false; status: number }> {
  try {
    const token = process.env.GITHUB_TOKEN;
    const res = await fetch(`${API}${path}`, {
      headers: { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      signal: AbortSignal.timeout(6000),
      ...(revalidate ? { next: { revalidate } } : { cache: "no-store" as const }),
    });
    if (!res.ok) return { ok: false, status: res.status };
    return { ok: true, data: (await res.json()) as T };
  } catch {
    return { ok: false, status: 0 };
  }
}

interface Commit { sha: string; author: { login: string } | null; commit: { author: { date: string }; committer: { date: string } } }

export interface WorkLink { owner: string; repo: string; kind: string; ref: string; path: string }

/** Splits a GitHub work link. blob/tree refs are taken as one segment (branch names with "/" fall back to the default branch). */
export function parseWorkLink(url: string): WorkLink | null {
  const m = url.replace(/^https:\/\/www\./i, "https://").match(/^https:\/\/github\.com\/([A-Za-z0-9-]{1,39})\/([A-Za-z0-9._-]{1,100})\/(blob|tree|commit|commits|pull)\/([^/?#]+)\/?([^?#]*)/i);
  if (!m) return null;
  return { owner: m[1], repo: m[2].replace(/\.git$/i, ""), kind: m[3].toLowerCase(), ref: decodeURIComponent(m[4]), path: decodeURIComponent(m[5].replace(/\/+$/, "")) };
}

/**
 * Was this work pushed by `username` after `since`? Returns an error message
 * for a clear "no", or null when it checks out or GitHub can't tell us.
 */
export async function checkFreshPush(url: string, username: string, previousSubmittedAt: string | null): Promise<string | null> {
  // 12 hours' grace: work pushed together with the previous day still counts.
  const since = previousSubmittedAt ? Date.parse(previousSubmittedAt) - GRACE_MS : null;
  const link = parseWorkLink(url);
  if (!link) return null;
  const { owner, repo } = link;
  const me = username.toLowerCase();

  let commit: Commit | null = null;
  if (link.kind === "commit") {
    const r = await gh<Commit>(`/repos/${owner}/${repo}/commits/${encodeURIComponent(link.ref)}`);
    if (!r.ok) return r.status === 404 || r.status === 422 ? "We couldn't find that commit. Check it's pushed to your public repository." : null;
    commit = r.data;
  } else if (link.kind === "pull") {
    const r = await gh<{ user: { login: string }; updated_at: string }>(`/repos/${owner}/${repo}/pulls/${encodeURIComponent(link.ref)}`);
    if (!r.ok) return r.status === 404 ? "We couldn't find that pull request in your public repository." : null;
    if (r.data.user.login.toLowerCase() !== me) return "That pull request was opened by someone else. Link to your own work.";
    if (since && Date.parse(r.data.updated_at) < since) return stale();
    return null;
  } else {
    // blob/tree/commits: the latest commit that touched this file or folder.
    const q = new URLSearchParams({ sha: link.ref, per_page: "1", ...(link.path ? { path: link.path } : {}) });
    let r = await gh<Commit[]>(`/repos/${owner}/${repo}/commits?${q}`);
    if (!r.ok && (r.status === 404 || r.status === 422)) {
      // A branch name containing "/" splits differently; retry on the default branch.
      q.delete("sha");
      r = await gh<Commit[]>(`/repos/${owner}/${repo}/commits?${q}`);
    }
    if (!r.ok) return r.status === 404 ? "We couldn't find that repository. Check it's public and the link is right." : null;
    if (!r.data.length) return "We couldn't find any commits for that file or folder. Push your work first, then submit.";
    commit = r.data[0];
  }

  // A commit made with an email GitHub can't match has no login; the repo is already theirs, so let it pass.
  if (commit.author && commit.author.login.toLowerCase() !== me) {
    return `The latest change to that work was pushed by “${commit.author.login}”, not your account (${username}). Push today's work yourself.`;
  }
  const when = commit.commit.committer?.date ?? commit.commit.author.date;
  if (since && Date.parse(when) < since) return stale();
  return null;
}

const stale = () => "We can't find a new push for this day: that work was last changed before your previous day was submitted. Push today's work, then submit its link.";

/**
 * Distinct days (IST) with commits by the learner in a repository, up to the
 * last 300 commits. Cached for an hour: it's for the admin view.
 */
export async function commitDays(owner: string, repo: string, username: string): Promise<number | null> {
  const dates = new Set<string>();
  const ist = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" });
  for (let page = 1; page <= 3; page++) {
    const r = await gh<Commit[]>(`/repos/${owner}/${repo}/commits?author=${encodeURIComponent(username)}&per_page=100&page=${page}`, 3600);
    if (!r.ok) return page === 1 ? null : dates.size;
    for (const c of r.data) dates.add(ist.format(new Date(c.commit.author.date)));
    if (r.data.length < 100) break;
  }
  return dates.size;
}

/** The repository a learner submits from most often. */
export function mainRepo(urls: (string | null)[]): { owner: string; repo: string } | null {
  const counts = new Map<string, number>();
  for (const u of urls) {
    const l = u && parseWorkLink(u);
    if (l) counts.set(`${l.owner}/${l.repo}`, (counts.get(`${l.owner}/${l.repo}`) ?? 0) + 1);
  }
  const top = [...counts].sort((a, b) => b[1] - a[1])[0]?.[0];
  if (!top) return null;
  const [owner, repo] = top.split("/");
  return { owner, repo };
}
