/**
 * Kamran's search: matches a typed question to the best answers, without AI.
 * Normalises words (Hinglish and common spellings to one form), forgives small
 * typos, and weighs the question title over keywords over the answer text.
 * Pure, so it is unit-tested.
 */

export interface Searchable {
  id: string;
  question: string;
  keywords?: string[];
  answer: string[];
}

/** Hinglish, short forms and synonyms, mapped to one canonical word. */
const SYNONYMS: Record<string, string> = {
  kaise: "how", kese: "how", kaisey: "how", kab: "when", kya: "what", kyu: "why", kyon: "why", kyun: "why",
  nahi: "not", nhi: "not", nahin: "not", na: "not", cant: "not", cannot: "not", unable: "not",
  khul: "open", khula: "open", kholna: "open", band: "locked", lock: "locked", locks: "locked",
  login: "signin", log: "signin", logon: "signin", signin: "signin", sign: "signin",
  repo: "github", repository: "github", repositories: "github", git: "github",
  notification: "reminder", notifications: "reminder", notify: "reminder", reminders: "reminder", alert: "reminder",
  phone: "device", mobile: "device", laptop: "device", devices: "device", another: "device",
  course: "track", courses: "track", tracks: "track", program: "track", programme: "track",
  submit: "submission", submitted: "submission", submitting: "submission", upload: "submission", jama: "submission",
  checkpoint: "assessment", checkpoints: "assessment", assessments: "assessment", test: "assessment", exam: "assessment",
  mock: "interview", interviews: "interview",
  register: "registration", registered: "registration", signup: "registration", enrol: "registration", enroll: "registration", join: "registration",
  certificate: "certificate", certification: "certificate",
  badal: "change", badalna: "change", switch: "change",
  din: "day", days: "day",
  app: "install", install: "install", offline: "offline", internet: "offline",
  linkedin: "linkedin", post: "linkedin",
  email: "contact", mail: "contact", support: "contact", help: "contact", human: "contact", person: "contact",
  missed: "miss", miss: "miss", skip: "miss", late: "miss",
  feedback: "feedback", review: "feedback", reviewer: "feedback", score: "feedback",
};

const STOP = new Set(["a", "an", "the", "is", "are", "am", "i", "my", "me", "to", "of", "in", "on", "for", "and", "or", "it", "do", "does", "can", "be", "with", "this", "that", "hai", "ho", "ka", "ki", "ke", "se", "mera", "meri", "mujhe", "kar", "karna", "karu", "karun", "you", "your", "what", "how", "kare", "karo", "kre", "raha", "rahi", "rahe", "hota", "hoti", "hua", "hui", "please", "pls", "plz", "bhai", "bro", "sir", "ji"]);

export function tokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => SYNONYMS[w] ?? w)
    .filter((w) => !STOP.has(w));
}

/** One edit apart (insert, delete or swap a letter), for words of five letters or more. */
function nearMiss(a: string, b: string) {
  if (a === b) return true;
  if (Math.min(a.length, b.length) < 5 || Math.abs(a.length - b.length) > 1) return false;
  let i = 0, j = 0, edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (++edits > 1) return false;
    if (a.length > b.length) i++;
    else if (b.length > a.length) j++;
    else { i++; j++; }
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
}

function hits(query: string[], field: string[]) {
  return query.filter((q) => field.some((f) => nearMiss(q, f))).length;
}

export interface Match<T> { item: T; score: number }

/** The best answers for a typed question, highest score first. */
export function searchSupport<T extends Searchable>(question: string, items: T[], limit = 3): Match<T>[] {
  const q = [...new Set(tokens(question))];
  if (!q.length) return [];
  return items
    .map((item) => {
      const title = tokens(item.question);
      const keys = tokens((item.keywords ?? []).join(" "));
      const body = tokens(item.answer.join(" "));
      // Title words count most, then keywords, then the answer text; full coverage gets a bonus.
      const covered = q.filter((w) => [...title, ...keys].some((f) => nearMiss(w, f))).length;
      const score = hits(q, title) * 3 + hits(q, keys) * 2 + hits(q, body) * 0.5 + (covered === q.length ? 2 : 0);
      return { item, score };
    })
    .filter((m) => m.score >= 2.5)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
