/**
 * Reminder copy, Duolingo-style: streak-aware, warmer in the morning, more
 * urgent toward the night, and varied so it never reads like a robot.
 * Pure, so it is unit-tested; the cron route only decides who gets one.
 */

export type Slot = "morning" | "midday" | "evening" | "night";

/** 09:00, 13:00, 17:00, 21:00 IST. Anything off-schedule maps to the nearest earlier slot. */
export function slotForIstHour(hour: number): Slot | null {
  if (hour < 8) return null;
  if (hour < 12) return "morning";
  if (hour < 16) return "midday";
  if (hour < 20) return "evening";
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

export interface Reminder { title: string; body: string; url: string; tag: string }

const pick = <T,>(list: T[], seed: number) => list[Math.abs(seed) % list.length];

export function buildReminder(r: ReminderInput): Reminder | null {
  // Done for today: only the morning "it's open" ever goes out, and that is before they could finish.
  if (r.doneToday && r.slot !== "morning") return null;

  const n = r.name;
  const mins = Math.max(15, Math.round(r.minutes / 15) * 15);
  const fire = r.streak >= 2 ? `🔥 ${r.streak}-day streak` : null;
  const kindLine = r.kind === "assessment" ? "It's a checkpoint day." : r.kind === "interview" ? "Mock interview day." : "One real problem.";
  const url = `/learn/day/${r.behind ? r.day - 1 : r.day}`;
  const tag = `day-${r.day}`; // later reminders replace earlier ones, never pile up

  if (r.slot === "morning") {
    if (r.behind) {
      return pick<Reminder>([
        { url, tag, title: `Day ${r.day} is open, ${n}`, body: `Day ${r.day - 1} is still waiting too. Start there; ${mins} minutes gets you back on track.` },
        { url, tag, title: `Let's catch up, ${n}`, body: `Day ${r.day - 1} first, then Day ${r.day}. One at a time, you've got this.` },
        { url, tag, title: `Yesterday's still open 👀`, body: `Finish Day ${r.day - 1} this morning and you're right back on schedule.` },
        { url, tag, title: `Fresh start, ${n}`, body: `Day ${r.day - 1} is waiting for you. ${mins} minutes and you're caught up.` },
        { url, tag, title: `Koi baat nahi, ${n} 🙂`, body: `Kal ka Day ${r.day - 1} pending hai. Pehle woh, phir Day ${r.day}. Aaram se, ek ek karke.` },
        { url, tag, title: `Chalo, catch up karte hain`, body: `Day ${r.day - 1} abhi khatam karo, ${mins} minute mein wapas track pe.` },
        { url, tag, title: `${n}, kal miss ho gaya?`, body: `Tension nahi. Day ${r.day - 1} aaj subah kar lo, sab set ho jayega.` },
        { url, tag, title: `Back on track mission 🎯`, body: `Pehle Day ${r.day - 1}, phir Day ${r.day}. Tum kar loge, ${n}.` },
      ], r.seed);
    }
    return pick<Reminder>([
      { url, tag, title: `Day ${r.day} is open: ${r.title}`, body: `Morning ${n}. About ${mins} minutes. ${kindLine}${fire ? ` ${fire}, keep it going.` : ""}` },
      { url, tag, title: `☀️ Day ${r.day}: ${r.title}`, body: `Good morning ${n}. ${kindLine} About ${mins} minutes.${fire ? ` ${fire}.` : ""}` },
      { url, tag, title: fire ? `${fire}. Day ${r.day} is ready` : `New day, new problem, ${n}`, body: `"${r.title}" is open. About ${mins} minutes. Coffee first, then this.` },
      { url, tag, title: `Day ${r.day} of 30 🚀`, body: `${n}, today is "${r.title}". ${kindLine} Do it before the day gets busy.` },
      { url, tag, title: `Chalo ${n}, Day ${r.day} time! 🔥`, body: `Aaj ka problem: "${r.title}". Bas ${mins} minute${fire ? `, aur ${fire} chal rahi hai` : ""}.` },
      { url, tag, title: `Good morning ${n} ☀️`, body: `Chai ready? Day ${r.day} bhi ready hai: "${r.title}".` },
      { url, tag, title: fire ? `${fire}! Aaj bhi rukna nahi` : `Naya din, naya problem`, body: `Day ${r.day} khul gaya hai, ${n}. Din busy hone se pehle kar lo.` },
      { url, tag, title: `Day ${r.day} unlock ho gaya 🔓`, body: `${n}, "${r.title}" wait kar raha hai. ${kindLine}` },
    ], r.seed);
  }

  // Behind on yesterday: after the morning, every nudge is about the day they should open.
  if (r.behind) r = { ...r, day: r.day - 1, title: r.behindTitle ?? `Day ${r.day - 1}`, minutes: r.behindMinutes ?? r.minutes, streak: 0 };

  if (r.slot === "midday") {
    return pick<Reminder>([
      { url, tag, title: fire ? `${fire}. Don't break it now` : `Day ${r.day} is waiting, ${n}`, body: `A lunch-break start on "${r.title}" makes tonight easy.` },
      { url, tag, title: `Quick one, ${n}?`, body: `Day ${r.day} takes about ${mins} minutes. Even 15 now counts.` },
      { url, tag, title: `Halfway through the day`, body: `Day ${r.day} is still open. Future you, in the interview, will thank you.` },
      { url, tag, title: `Lunch break plan? 🍱`, body: `Eat, then 20 minutes on "${r.title}". The rest tonight will fly.` },
      { url, tag, title: `Lunch ke baad 15 minute? 🍱`, body: `${n}, Day ${r.day} shuru kar do. Raat ko aadha kaam already done hoga.` },
      { url, tag, title: fire ? `${fire}, tootne mat dena` : `${n}, Day ${r.day} yaad hai na?`, body: `"${r.title}" abhi bhi open hai. Thoda sa abhi, baaki shaam ko.` },
      { url, tag, title: `Aadha din nikal gaya ⏰`, body: `Day ${r.day} abhi pending hai, ${n}. Interview wale din tum khud ko thank you bologe.` },
      { url, tag, title: `Bas ek shuruaat, ${n}`, body: `Day ${r.day} ka brief padh lo. Start karna hi sabse mushkil hota hai.` },
    ], r.seed);
  }

  if (r.slot === "evening") {
    return pick<Reminder>([
      { url, tag, title: fire ? `Your ${r.streak}-day streak is on the line 🔥` : `Still time for Day ${r.day}`, body: `${n}, about ${mins} minutes left between you and done.` },
      { url, tag, title: `Day ${r.day} misses you`, body: `"${r.title}" is ready when you are. Open it now, finish before dinner.` },
      { url, tag, title: `Evening check-in`, body: `Day ${r.day} isn't submitted yet, ${n}. Start it now; it's the best part of the day to do it.` },
      { url, tag, title: `${n}, 5 minutes?`, body: `Just open Day ${r.day} and read the brief. Starting is the hard part.` },
      { url, tag, title: fire ? `${fire} khatre mein hai! 😬` : `Abhi bhi time hai, ${n}`, body: `Day ${r.day} ke liye bas ${mins} minute chahiye. Dinner se pehle nipta do.` },
      { url, tag, title: `Day ${r.day} tumhe yaad kar raha hai 🥺`, body: `"${r.title}" ready hai, ${n}. Abhi kholo, jaldi ho jayega.` },
      { url, tag, title: `Shaam ka check-in`, body: `${n}, Day ${r.day} abhi submit nahi hua. Ab shuru karo, sabse best time hai.` },
      { url, tag, title: `Chalo ${n}, ab ya kabhi nahi 💪`, body: `Day ${r.day} kholo, brief padho, kaam shuru. Baaki apne aap ho jayega.` },
    ], r.seed);
  }

  // night: last call
  return pick<Reminder>([
    { url, tag, title: fire ? `Last call: save your ${r.streak}-day streak 🔥` : `Last call for Day ${r.day}`, body: `${n}, it closes at midnight. Submit what you have; you can improve it tomorrow.` },
    { url, tag, title: `Before you sleep, ${n}`, body: `Day ${r.day} is still open. A rough submission beats none, and it keeps your refund on track.` },
    { url, tag, title: `3 hours left ⏳`, body: `Day ${r.day} is still unsubmitted, ${n}. Done is better than perfect.` },
    { url, tag, title: fire ? `Don't let ${r.streak} days go to waste` : `One last nudge tonight`, body: `Open Day ${r.day}, submit a draft, sleep easy. You can polish it tomorrow.` },
    { url, tag, title: fire ? `Last call! ${fire} bacha lo` : `Last call, ${n}! 🌙`, body: `Day ${r.day} midnight tak open hai. Jo bhi ho, submit kar do. Kal improve kar lena.` },
    { url, tag, title: `Sone se pehle, ${n}…`, body: `Day ${r.day} abhi baaki hai. Rough submission bhi chalega, aur refund track pe rahega.` },
    { url, tag, title: `Sirf 3 ghante bache ⏳`, body: `Day ${r.day} pending hai, ${n}. Perfect nahi, bas done chahiye.` },
    { url, tag, title: fire ? `${r.streak} din ki mehnat, aise mat jaane do` : `Aaj ka last reminder 🙏`, body: `Day ${r.day} kholo, draft submit karo, aaram se so jao.` },
  ], r.seed);
}

/** Consecutive submitted days ending at `day` (inclusive). */
export function streakEnding(submitted: Set<number>, day: number) {
  let s = 0;
  for (let d = day; d >= 1 && submitted.has(d); d--) s++;
  return s;
}
