import { enrolment } from "@/data/config";
import { refundConditions, refundTiming } from "@/data/program";
import { LAUNCH_OFFER, offerOpen } from "@/lib/offer";
import { formatINR } from "@/lib/format";

export interface SupportAnswer {
  question: string;
  /** Short paragraphs; plain text. */
  answer: string[];
  /** One follow-up action, when there is an obvious next step. */
  action?: { label: string; href: string };
}

export interface SupportTopic {
  id: string;
  title: string;
  /** Shown first to signed-in learners, or to visitors deciding whether to join. */
  audience: "both" | "public" | "learner";
  items: SupportAnswer[];
}

export const SUPPORT_EMAIL = "team@klymb.ai";

/**
 * Kamran's answers. Facts come from the same data the site renders (prices,
 * refund conditions, daily time), so the bot can never disagree with a page.
 * Edit the wording here; add a question by adding an item.
 */
export function supportTopics(): SupportTopic[] {
  const price = offerOpen()
    ? `Every track is ${formatINR(LAUNCH_OFFER.price)} at launch, until ${LAUNCH_OFFER.endsLabel}. After that, tracks return to their normal prices, shown on each track's page.`
    : "Each track's price is shown on its page and before you pay.";

  return [
    {
      id: "pricing",
      title: "Price and refund",
      audience: "both",
      items: [
        { question: "How much does it cost?", answer: [price, "One payment, by UPI, card or net banking through Razorpay. Day 1 is free on every track, so you can try before you pay."], action: { label: "See the tracks", href: "/tracks" } },
        { question: "How does the 100% refund work?", answer: ["Complete the programme and we refund 100% of what you paid. Complete means all of these:", ...refundConditions.map((c) => `• ${c}`), refundTiming], action: { label: "Full refund policy", href: "/refund-policy" } },
        { question: "Is there a free trial?", answer: ["Yes. Day 1 of every track is free. Register, sign in with Google and start straight away. You pay only to unlock Days 2 to 30."], action: { label: "Register", href: "/register" } },
        { question: "Is there EMI?", answer: ["Not yet. At the launch price it's a single small payment by UPI, card or net banking."] },
      ],
    },
    {
      id: "course",
      title: "How the course works",
      audience: "both",
      items: [
        { question: "What happens each day?", answer: [`One real workplace problem a day, about ${enrolment.dailyTime.replace(" a day", "")}. You read the brief, build the deliverable, push it to your GitHub repo and submit the link.`] },
        { question: "Why can't I open the next day?", answer: ["Days unlock in order: submit today's day and the next one opens straight away. On a paid track, Days 2 to 30 also need payment."], action: { label: "Open my dashboard", href: "/learn" } },
        { question: "What are checkpoints and mock interviews?", answer: ["On Days 7, 14, 21 and 28 you complete a checkpoint, scored against a rubric with written feedback. Days 29 and 30 are two mock interviews."] },
        { question: "When can I start?", answer: ["Any day. Day 1 opens as soon as you register; your 30 days run from there."] },
        { question: "Why do I need a GitHub repository?", answer: ["Your repository is your portfolio: every day's work goes there, and reviewers check submissions against it. Create it public, with the name the registration page suggests."] },
      ],
    },
    {
      id: "account",
      title: "Sign-in and devices",
      audience: "learner",
      items: [
        { question: "It says I'm signed in on another device", answer: ["Your account works on one device at a time. Sign out on the other device (top bar, Sign out), then sign in here.", `Lost that device? The lock frees itself after 7 days without use, or email ${SUPPORT_EMAIL} and we'll reset it.`] },
        { question: "I can't sign in", answer: ["Use Continue with Google with the exact email you registered with. A different Google account won't find your place."], action: { label: "Sign in", href: "/learn/login" } },
        { question: "I paid but it's still locked", answer: [`Payments usually confirm within a minute. Refresh your dashboard. If it's still locked after 10 minutes, email ${SUPPORT_EMAIL} with your Razorpay payment ID from the receipt.`] },
      ],
    },
    {
      id: "app",
      title: "Reminders and the app",
      audience: "learner",
      items: [
        { question: "How do I turn on reminders?", answer: ["Tap the bell next to your name in the top bar, then Turn on reminders and Allow. You'll get at most three a day, at 9 am, 2 pm and 8 pm, and only until that day is submitted."] },
        { question: "Can I install Klymb as an app?", answer: ["Yes. On Android Chrome, use the menu, then Install app. On iPhone, open the site in Safari, tap Share, then Add to Home Screen."] },
        { question: "Does it work offline?", answer: ["Days you've opened stay readable offline, and work you submit offline is saved and sent automatically when you're back online."] },
      ],
    },
  ];
}
