/**
 * Reminder copy: streak-aware, friendly, and specific to the day. Pure, so it
 * is unit-tested; the cron route only decides who gets one.
 *
 * Calm on purpose. Chrome on Android hides notifications it judges spammy, and
 * frequency, repeated alerts and urgent marketing wording ("last call",
 * countdowns, emoji runs) are what trip it. So: three a day at most, only the
 * morning one makes a sound, and the wording reads like a mentor, not an ad.
 */

export type Slot = "morning" | "midday" | "night";

/** 09:00, 14:00, 20:00 IST. Anything off-schedule maps to the nearest earlier slot. */
export function slotForIstHour(hour: number): Slot | null {
  if (hour < 8) return null;
  if (hour < 12) return "morning";
  if (hour < 18) return "midday";
  return "night";
}

export interface ReminderInput {
  slot: Slot;
  name: string;
  day: number;
  title: string;
  minutes: number;
  kind: "build" | "assessment" | "interview";
  /** Consecutive days submitted, ending yesterday. */
  streak: number;
  doneToday: boolean;
  /** Yesterday's day is still unsubmitted. */
  behind: boolean;
  /** Yesterday's title and time, used by the later nudges when behind. */
  behindTitle?: string;
  behindMinutes?: number;
  /** Picks the wording variant; the date keeps it stable within one send. */
  seed: number;
}

export interface Reminder {
  title: string;
  body: string;
  url: string;
  tag: string;
  /** Only the morning reminder sounds; later ones replace it quietly. */
  loud: boolean;
}

type Copy = Pick<Reminder, "title" | "body">;
const pick = <T,>(list: T[], seed: number) => list[Math.abs(seed) % list.length];

export function buildReminder(r: ReminderInput): Reminder | null {
  // Done for today: only the morning "it's open" ever goes out, and that is before they could finish.
  if (r.doneToday && r.slot !== "morning") return null;

  const url = `/learn/day/${r.behind ? r.day - 1 : r.day}`;
  const tag = `day-${r.day}`; // later reminders replace earlier ones, never pile up
  const done = (c: Copy): Reminder => ({ ...c, url, tag, loud: r.slot === "morning" });

  const n = r.name;
  const mins = Math.max(15, Math.round(r.minutes / 15) * 15);
  const streak = r.streak >= 2 ? `${r.streak}-day streak` : null;
  const kindLine = r.kind === "assessment" ? "It's a checkpoint day." : r.kind === "interview" ? "Mock interview day." : "One real problem.";

  if (r.slot === "morning") {
    if (r.behind) {
      return done(pick<Copy>([
        { title: `Day ${r.day} is open, ${n}`, body: `Day ${r.day - 1} is still waiting too. Start there; about ${mins} minutes gets you back on track.` },
        { title: `Let's catch up, ${n}`, body: `Day ${r.day - 1} first, then Day ${r.day}. One at a time.` },
        { title: `Yesterday's day is still open`, body: `Finish Day ${r.day - 1} this morning and you're back on schedule.` },
        { title: `A fresh start, ${n}`, body: `Day ${r.day - 1} is waiting for you. About ${mins} minutes and you're caught up.` },
        { title: `Koi baat nahi, ${n}`, body: `Kal ka Day ${r.day - 1} pending hai. Pehle woh, phir Day ${r.day}. Ek ek karke.` },
        { title: `Chalo, catch up karte hain`, body: `Day ${r.day - 1} aaj subah kar lo, ${mins} minute mein wapas track pe.` },
        { title: `${n}, kal ka day baaki hai`, body: `Day ${r.day - 1} aaj subah kar lo, sab set ho jayega.` },
        { title: `Aaj wapas track pe`, body: `Pehle Day ${r.day - 1}, phir Day ${r.day}. Tum kar loge, ${n}.` },
      ], r.seed));
    }
    return done(pick<Copy>([
      { title: `Day ${r.day} is open: ${r.title}`, body: `Morning ${n}. About ${mins} minutes. ${kindLine}${streak ? ` ${streak}, keep it going.` : ""}` },
      { title: `Day ${r.day}: ${r.title}`, body: `Good morning ${n}. ${kindLine} About ${mins} minutes.${streak ? ` ${streak}.` : ""}` },
      { title: streak ? `${streak}. Day ${r.day} is ready` : `Day ${r.day} is ready, ${n}`, body: `"${r.title}" is open. About ${mins} minutes.` },
      { title: `Day ${r.day} of 30`, body: `${n}, today is "${r.title}". ${kindLine} A good one to do before the day gets busy.` },
      { title: `${n}, Day ${r.day} khul gaya`, body: `Aaj ka problem: "${r.title}". Lagbhag ${mins} minute${streak ? `, aur ${streak} chal rahi hai` : ""}.` },
      { title: `Good morning ${n}`, body: `Day ${r.day} ready hai: "${r.title}". Lagbhag ${mins} minute.` },
      { title: streak ? `${streak}, aaj bhi jaari rakho` : `Naya din, naya problem`, body: `Day ${r.day} khul gaya hai, ${n}. Din busy hone se pehle kar lo.` },
      { title: `Day ${r.day} unlock ho gaya`, body: `${n}, "${r.title}" tumhara intezaar kar raha hai. ${kindLine}` },
    ], r.seed));
  }

  // Behind on yesterday: after the morning, every nudge is about the day they should open.
  if (r.behind) r = { ...r, day: r.day - 1, title: r.behindTitle ?? `Day ${r.day - 1}`, minutes: r.behindMinutes ?? r.minutes, streak: 0 };
  const m = Math.max(15, Math.round(r.minutes / 15) * 15);
  const s = r.streak >= 2 ? `${r.streak}-day streak` : null;

  if (r.slot === "midday") {
    return done(pick<Copy>([
      { title: s ? `Your ${s} continues with Day ${r.day}` : `Day ${r.day} is waiting, ${n}`, body: `An afternoon start on "${r.title}" makes tonight easy.` },
      { title: `A quick one, ${n}?`, body: `Day ${r.day} takes about ${m} minutes. Even 15 now counts.` },
      { title: `Day ${r.day} is still open`, body: `"${r.title}" is ready when you are. Future you, in the interview, will thank you.` },
      { title: `Got a free half hour?`, body: `Start "${r.title}" now and the rest tonight will be quick.` },
      { title: `${n}, Day ${r.day} abhi baaki hai`, body: `Thoda sa abhi shuru kar do. Raat ko aadha kaam ho chuka hoga.` },
      { title: s ? `${s}, ise jaari rakho` : `Day ${r.day} yaad hai na, ${n}?`, body: `"${r.title}" abhi bhi open hai. Thoda abhi, baaki shaam ko.` },
      { title: `Day ${r.day} pending hai`, body: `${n}, lagbhag ${m} minute ka kaam hai. Interview wale din kaam aayega.` },
      { title: `Bas ek shuruaat, ${n}`, body: `Day ${r.day} ka brief padh lo. Start karna hi sabse mushkil hota hai.` },
    ], r.seed));
  }

  // night: the last, gentle nudge of the day
  return done(pick<Copy>([
    { title: s ? `Keep your ${s} going` : `Day ${r.day} before you sleep?`, body: `${n}, submit what you have tonight; you can improve it tomorrow.` },
    { title: `Before you sleep, ${n}`, body: `Day ${r.day} is still open. A rough submission beats none, and it keeps your refund on track.` },
    { title: `Day ${r.day} is still open`, body: `${n}, done is better than perfect. A draft is enough for today.` },
    { title: s ? `${r.streak} days in a row so far` : `One last reminder today`, body: `Open Day ${r.day}, submit a draft, rest easy. You can polish it tomorrow.` },
    { title: s ? `${s}, aaj bhi jod lo` : `${n}, Day ${r.day} abhi baaki hai`, body: `Jo bhi ho, submit kar do. Kal improve kar lena.` },
    { title: `Sone se pehle, ${n}`, body: `Day ${r.day} abhi baaki hai. Rough submission bhi chalega, aur refund track pe rahega.` },
    { title: `Day ${r.day} pending hai`, body: `${n}, perfect nahi, bas done chahiye. Draft bhi kaafi hai.` },
    { title: s ? `${r.streak} din ki mehnat, jaari rakho` : `Aaj ka aakhri reminder`, body: `Day ${r.day} kholo, draft submit karo, aaram se so jao.` },
  ], r.seed));
}

/** Consecutive submitted days ending at `day` (inclusive). */
export function streakEnding(submitted: Set<number>, day: number) {
  let s = 0;
  for (let d = day; d >= 1 && submitted.has(d); d--) s++;
  return s;
}
