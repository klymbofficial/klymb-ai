import { createHmac, hkdfSync, timingSafeEqual } from "node:crypto";
import { BUILT_LESSONS, MODULES } from "@/data/system-design/course-app";

/**
 * Who gets the 8 PM System Design reminder, and for what. Pure, so it is
 * unit-tested; /api/cron/sd-reminders only loads the rows and sends.
 *
 * Lessons go live by being added to LESSON_RELEASES. The route also checks
 * lib/sd-pace, so nobody is pointed at a lesson that isn't open to them yet
 * and the refund is only mentioned while it can be earned. "Missed today" means
 * an enrolled learner passed no lesson check today (IST). They are pointed at
 * the first lesson in course order that is out and not passed. Once every
 * lesson in the course is passed, the final assessment is the target. A
 * learner who has passed everything that is out is caught up and left alone,
 * and the day a new lesson ships they are due again, with no change here.
 *
 * Cadence, so a learner who has stepped away isn't mailed every night for
 * weeks: daily for the first three reminders in a row, then every third day,
 * then weekly from the tenth. Passing any lesson starts the count again.
 */

/** lesson_checks.lesson for the final assessment, once it is graded on the server. */
export const SD_FINAL_ASSESSMENT = "final";

export interface CourseLesson { id: string; title: string; minutes: number; position: number }

/** Every lesson in the course, built or not, in the order the course runs. */
export const COURSE_LESSONS: CourseLesson[] = MODULES.flatMap((m, mi) =>
  m.lessons.map(([title, duration], li) => ({ id: `${mi}-${li}`, title, minutes: minutesOf(duration), position: 0 })),
).map((l, i) => ({ ...l, position: i }));

/** "3:10" of video is roughly a 15-minute lesson once the check is in. Never below 10. */
function minutesOf(duration: string) {
  const [m, s] = duration.split(":").map(Number);
  const video = (m || 0) + (s || 0) / 60;
  return Math.max(10, Math.ceil((video + 10) / 5) * 5);
}

export function sdLessonCounts(built: readonly string[] = BUILT_LESSONS) {
  return { out: COURSE_LESSONS.filter((l) => built.includes(l.id)).length, total: COURSE_LESSONS.length };
}

/** Whole days from one "YYYY-MM-DD" to another. */
export function daysBetween(from: string, to: string) {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 864e5);
}

export interface ReminderLearner {
  /** IST date the seat opened. */
  enrolledOn: string;
  /** lesson → IST date its check was first passed. */
  passes: Map<string, string>;
  /** IST date of the last reminder, and how many in a row without a pass since. */
  remindedOn: string | null;
  streak: number;
}

export type ReminderTarget = { kind: "lesson"; lesson: CourseLesson } | { kind: "assessment" };

export interface ReminderPick {
  target: ReminderTarget;
  /** Lessons out and not passed, the target included. */
  behind: number;
  /** The streak to store once this one is sent. */
  streak: number;
}

/** The reminder this learner is due tonight, or null. */
export function pickSdReminder(l: ReminderLearner, today: string, built: readonly string[] = BUILT_LESSONS): ReminderPick | null {
  if (daysBetween(l.enrolledOn, today) < 1) return null; // the day they bought it isn't a missed day
  if (l.remindedOn && daysBetween(l.remindedOn, today) < 1) return null;

  const passedOn = [...l.passes.entries()].filter(([id]) => id !== SD_FINAL_ASSESSMENT).map(([, d]) => d);
  if (passedOn.includes(today)) return null;

  const open = COURSE_LESSONS.filter((x) => built.includes(x.id) && !l.passes.has(x.id));
  let target: ReminderTarget;
  if (open.length) target = { kind: "lesson", lesson: open[0] };
  else if (COURSE_LESSONS.every((x) => l.passes.has(x.id)) && !l.passes.has(SD_FINAL_ASSESSMENT)) target = { kind: "assessment" };
  else return null; // caught up on everything that is out, or finished

  // A pass on or after the last reminder means they came back: start counting again.
  const lastPass = passedOn.sort().at(-1);
  const streak = !l.remindedOn || (lastPass && lastPass >= l.remindedOn) ? 0 : l.streak;
  const gap = l.remindedOn ? daysBetween(l.remindedOn, today) : Infinity;
  const due = streak < 3 || (streak < 10 ? gap >= 3 : gap >= 7);
  if (!due) return null;

  return { target, behind: Math.max(1, open.length), streak: streak + 1 };
}

/*
 * Unsubscribe links. A token is the address and an HMAC over it, keyed from
 * AUTH_SECRET with its own derived key, so it can't be made for someone else
 * and needs no table. It never expires: an unsubscribe link should keep working.
 */

const unsubKey = (secret: string) => Buffer.from(hkdfSync("sha256", secret, "klymb.ai sd reminders", "unsubscribe", 32));
const macOf = (secret: string, email: string) => createHmac("sha256", unsubKey(secret)).update(email).digest();

export function unsubscribeToken(email: string, secret: string) {
  return `${Buffer.from(email).toString("base64url")}.${macOf(secret, email).toString("base64url")}`;
}

/** The address a token was made for, or null if it was altered or the secret changed. */
export function emailFromToken(token: unknown, secret: string | undefined): string | null {
  if (!secret || typeof token !== "string" || token.length > 600) return null;
  const [e, m] = token.split(".");
  if (!e || !m) return null;
  const email = Buffer.from(e, "base64url").toString("utf8");
  const given = Buffer.from(m, "base64url");
  const want = macOf(secret, email);
  return given.length === want.length && timingSafeEqual(given, want) ? email : null;
}

export const SD_PUSH_SLOTS = ["morning", "evening", "night"] as const;
export type SdPushSlot = (typeof SD_PUSH_SLOTS)[number];

/** A lesson's own hook: the question at 8 AM, then what the learner would do at 5 PM. */
const PUSH_HOOKS: Record<string, { morning: string; topic: string; evening: string; eveningBody: string }> = {
  "0-0": { morning: "Last pair, do buyers. Kaise? 🤔", topic: "system design hota kya hai", evening: "Dono ko “Order confirmed”. Galti kahan hui?", eveningBody: "Stock check karna kaafi hai?" },
  "0-1": { morning: "Tap se saved cart tak kya hota hai? 🤔", topic: "ek app andar se kaise chalti hai", evening: "Timeout aaya. Cart save hua ya nahi?", eveningBody: "Request ka poora raasta" },
  "0-2": { morning: "Users badhe, app slow. Kyun? 🤔", topic: "apps slow kyun hoti hain", evening: "App slow hai. Pehle kya check karoge?", eveningBody: "Sirf servers badhana kaafi hai?" },
  "0-3": { morning: "Teen servers. Request kiske paas jaaye? 🤔", topic: "load balancing kaise kaam karti hai", evening: "Ek server down. Ab kya hoga?", eveningBody: "Login bhi na toote, kaise?" },
  "0-4": { morning: "Purane order ka price kyun nahi badalta? 🤔", topic: "database mein data kaise rakhte hain", evening: "Har column par index laga dein?", eveningBody: "Fayda bhi hai, cost bhi." },
  "0-5": { morning: "Har baar database se kyun poochna? 🤔", topic: "caching kaise kaam karti hai", evening: "Cache mein purana price. Ab kya?", eveningBody: "Tez bhi, sahi bhi, kaise?" },
  "0-6": { morning: "Database bhaari ho gaya. Ab kya? 🤔", topic: "replication aur sharding mein farak", evening: "Address badla, purana kyun dikh raha hai?", eveningBody: "Replica ya shard?" },
  "1-1": { morning: "Ek service slow, poori app kyun ruke? 🤔", topic: "failure ke liye design kaise karte hain", evening: "Timeout aaya. Retry kar dein?", eveningBody: "Payment do baar na kat jaaye" },
  "1-3": { morning: "Ek post, 10 lakh followers. Kaise? 🤔", topic: "social feed kaise banti hai", evening: "Post pehle bhejein ya feed khulne par?", eveningBody: "Dono ka trade-off" },
};

/** Where a learner stands today, which decides how a notification speaks to them. */
export interface PushStanding {
  /** They've watched or worked on this lesson without passing it yet. */
  started: boolean;
  /** Days in a row with a pass, ending yesterday. */
  streak: number;
  /** They had passed something, but not yesterday or today, so a streak has lapsed. */
  lapsed: boolean;
}

/** The learner's standing, from the IST dates of their passes. */
export function pushStanding(passDates: string[], started: boolean, today: string): PushStanding {
  const days = new Set(passDates);
  let streak = 0;
  for (let at = Date.parse(`${today}T00:00:00Z`) - 864e5; days.has(new Date(at).toISOString().slice(0, 10)); at -= 864e5) streak++;
  return { started, streak, lapsed: days.size > 0 && streak === 0 };
}

/** Kamran's face for the moment, as on the 30-day tracks. */
const pushFace = (mood: "excited" | "surprised" | "sleepy" | "missing") => `/mascots/kamran-${mood}-v2.png`;

/**
 * One of the day's three notifications, in the order: started, lapsed, on a
 * streak, everyone else. Each replaces the one before it, and only the
 * morning's sounds: repeated alerts from one site are what Chrome's spam
 * detection flags, which is also why none says "last call" or counts down.
 */
export function sdReminderPush(lesson: CourseLesson | null, slot: SdPushSlot, name: string | null | undefined, standing: PushStanding) {
  const first = name?.trim().split(/\s+/)[0] || null;
  const you = (text: string) => (first ? `${first}, ${text}` : `${text[0].toUpperCase()}${text.slice(1)}`);
  const base = { url: `/learn/system-design${lesson ? `?lesson=${lesson.id}` : ""}`, tag: "sd-reminder", loud: slot === "morning" };
  if (!lesson) return { ...base, title: you("bas final assessment baaki hai"), body: "Yeh kar lo aur course poora.", icon: pushFace("excited") };

  const day = `Day ${lesson.position + 1}`;
  const hook = PUSH_HOOKS[lesson.id];
  const copy = (title: string, body: string, mood: Parameters<typeof pushFace>[0]) => ({ ...base, title, body, icon: pushFace(mood) });

  if (standing.started) {
    if (slot === "morning") return copy(you(`${day} shuru kiya tha`), "Jahan chhoda tha, wahin se aage badho.", "excited");
    if (slot === "evening") return copy(`${day} poora kar lein?`, "Thoda sa aur, aur aaj ka concept clear.", "surprised");
    return copy(you(`${day} poora ho sakta hai`), "Thoda waqt ho toh aaj hi khatam kar lo.", "sleepy");
  }
  if (standing.lapsed) {
    if (slot === "morning") return copy(first ? `Koi baat nahi, ${first}` : "Koi baat nahi", `Aaj se nayi streak. ${day} ready hai.`, "missing");
    if (slot === "evening") return copy(you("wapas aa jao"), `${day} se phir shuru karte hain. Ek lesson kaafi hai.`, "missing");
    return copy("Aaj se nayi shuruaat?", `${day} kar lo, aur streak phir se chalu.`, "missing");
  }
  const streak = standing.streak >= 2 ? `${standing.streak} din ki streak` : null;
  if (slot === "morning") return copy(hook?.morning ?? `${day} ready hai`, streak ? `${streak} chal rahi hai. ${day} ready hai.` : you(hook ? `aaj samjho ${hook.topic}. ${day} ready hai.` : `aaj ka lesson: ${lesson.title}.`), "excited");
  if (slot === "evening") return copy(hook?.evening ?? `${day} abhi baaki hai`, `${hook?.eveningBody ?? lesson.title} ${day} mein approach samjho.`, "surprised");
  if (streak) return copy(first ? `${streak}, ${first}` : streak, `${day} kar lo, aur streak chalti rahegi.`, "sleepy");
  return copy(you("aaj ka lesson kar lein?"), `${day} abhi baaki hai. Thoda waqt ho toh ek concept aur clear kar lo.`, "sleepy");
}
