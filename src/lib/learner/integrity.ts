/**
 * Anti-cheating rules for a day submission. Pure, so they are unit-tested;
 * the server action runs them after authorisation and before saving.
 *
 * - Every day needs a link to today's work inside the learner's own GitHub
 *   account: a file, folder, commit or pull request, not a bare profile or
 *   repository root, and never a link already used for another day.
 * - Every question on the day is answered in the learner's own words.
 * - At most MAX_NEW_DAYS_PER_DAY new days a calendar day (IST), so catching
 *   up works but racing through 30 days in an evening does not.
 */

export const MAX_NEW_DAYS_PER_DAY = 3;
export const MIN_ANSWER_CHARS = 25;

const WORK_LINK = /^https:\/\/github\.com\/[A-Za-z0-9-]{1,39}\/[A-Za-z0-9._-]{1,100}\/(blob|tree|commit|pull|commits)\/\S+/i;

/** Lower-cased, without the fragment, query or trailing slash: two spellings of one link match. */
export function canonicalLink(url: string) {
  return url.trim().replace(/[?#].*$/, "").replace(/\/+$/, "").replace(/^https:\/\/www\./i, "https://").toLowerCase();
}

export function checkWorkLink(url: string | null): string | null {
  if (!url) return "Add the link to today's work on GitHub.";
  if (!WORK_LINK.test(url.replace(/^https:\/\/www\./i, "https://"))) {
    return "Link to today's work itself: a file, folder, commit or pull request in your repository (for example …/blob/main/day-05/README.md), not just the repository or your profile.";
  }
  return null;
}

export function checkReusedLink(url: string, day: number, others: { day: number; deliverable_url: string | null }[]): string | null {
  const mine = canonicalLink(url);
  const clash = others.find((s) => s.day !== day && s.deliverable_url && canonicalLink(s.deliverable_url) === mine);
  return clash ? `You already submitted that link for Day ${clash.day}. Each day needs its own work: link to today's file or commit.` : null;
}

export function checkAnswers(questions: string[], answers: string[] | null): string | null {
  if (!questions.length) return null;
  const given = (answers ?? []).map((a) => a.trim());
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  for (let i = 0; i < questions.length; i++) {
    const a = given[i] ?? "";
    if (a.length < MIN_ANSWER_CHARS) return `Answer question ${i + 1} in at least a full sentence (${MIN_ANSWER_CHARS}+ characters).`;
    if (norm(a) === norm(questions[i]) || norm(questions[i]).includes(norm(a))) return `Question ${i + 1}: write your own answer, not the question.`;
    if (/^(.)\1+$/.test(a.replace(/\s/g, "")) || new Set(norm(a).split(" ")).size < 4) return `Question ${i + 1}: that doesn't look like a real answer.`;
  }
  const uniq = new Set(given.slice(0, questions.length).map(norm));
  if (uniq.size < questions.length) return "Each question needs its own answer; some of yours are the same.";
  return null;
}

/** How many days (other than this one) were first submitted on the given IST date. submitted_at is set once, on the first save. */
export function newDaysOn(date: string, day: number, submissions: { day: number; submitted_at: string }[]) {
  const ist = (iso: string) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date(iso));
  return submissions.filter((s) => s.day !== day && ist(s.submitted_at) === date).length;
}

export function checkPace(date: string, day: number, submissions: { day: number; submitted_at: string }[]): string | null {
  if (submissions.some((s) => s.day === day)) return null; // re-saving an existing day is always fine
  return newDaysOn(date, day, submissions) >= MAX_NEW_DAYS_PER_DAY
    ? `You've completed ${MAX_NEW_DAYS_PER_DAY} new days today, which is the daily limit. Come back tomorrow for Day ${day}: the work sticks better with sleep in between.`
    : null;
}
