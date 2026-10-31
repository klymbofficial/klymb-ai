/**
 * Content for the System Design course app (/learn/system-design).
 *
 * The course is "System Design in 21 Days": a Day 0 start, then three weeks.
 * This file reaches every browser, so it holds the outline only: the lessons
 * themselves are in lessons.ts, on the server, and are handed to the app by
 * src/lib/sd-lessons.ts according to what the viewer may open. Lessons not in
 * BUILT_LESSONS are listed as coming soon. The six-question final assessment
 * and its diagrams are course-wide.
 */
export interface CourseModule {
  title: string;
  /** Three labels animated on the player's thumbnail while the video plays. */
  flow: [string, string, string];
  /** [title, duration "m:ss"] */
  lessons: [string, string][];
}

export const MODULES: CourseModule[] = [
  { title: "Start here", flow: ["Phone", "Servers", "Database"], lessons: [["Raju ka dhaba: what system design is", "4:08"]] },
  {
    title: "Week 1 · Handling scale",
    flow: ["Users", "Load balancer", "Servers"],
    lessons: [
      ["Flipkart Big Billion Day: predictable vs sudden load", "3:10"],
      ["Swiggy dinner rush: load balancing", "3:20"],
      ["Hotstar IPL final: video, storage and CDN", "3:11"],
      ["Wallet vs likes: SQL vs NoSQL", "2:42"],
      ["Myntra sale: indexing and read replicas", "2:39"],
      ["CSK 10 lakh views: sharding and hot keys", "0:00"],
      ["OTP login: rate limiting and auth", "0:00"],
    ],
  },
  {
    title: "Week 2 · Real-time and reliability",
    flow: ["Event", "Queue", "Worker"],
    lessons: [
      ["Zepto orders: microservices and queues", "0:00"],
      ["Cricbuzz wicket: notification fan-out", "0:00"],
      ["WhatsApp ticks: real-time connections", "0:00"],
      ["Uber nearby drivers: geo systems", "0:00"],
      ["BookMyShow seats: locking and concurrency", "0:00"],
      ["UPI double tap: idempotency", "0:00"],
      ["Mock round: design a URL shortener", "0:00"],
    ],
  },
  {
    title: "Week 3 · Advanced and AI-era",
    flow: ["Query", "Retrieve", "LLM"],
    lessons: [
      ["Instagram celebrity post: feeds and ranking", "0:00"],
      ["Flipkart search: autocomplete", "0:00"],
      ["Wallet vs likes: consistency and CAP", "0:00"],
      ["Netflix outage: failures and circuit breakers", "0:00"],
      ["AI support bot: RAG", "0:00"],
      ["ChatGPT-style app: LLM serving", "0:00"],
      ["Capstone: design Zepto end to end", "0:00"],
    ],
  },
];

/** The lessons that exist, by lesson id ("module-lesson", zero-based). Every other lesson is coming soon. */
export const BUILT_LESSONS = ["0-0", "1-0", "1-1", "1-2", "1-3", "1-4"];
/** Open to everyone. Every other built lesson needs a seat. */
export const FREE_LESSONS = ["0-0"];

export type Question =
  | { type: "mcq" | "timed"; typeLabel: string; topic: string; prompt: string; options: string[]; ans: number }
  | { type: "multi"; typeLabel: string; topic: string; prompt: string; options: string[]; ans: number[] }
  | { type: "diagram"; typeLabel: string; topic: string; prompt: string; ans: number }
  | { type: "order"; typeLabel: string; topic: string; prompt: string; items: string[]; start: number[] }
  | { type: "text"; typeLabel: string; topic: string; prompt: string };

/** The pre- and post-assessment ask the same six questions, one of each type. */
export const QUESTIONS: Question[] = [
  { type: "mcq", typeLabel: "Multiple choice", topic: "Scaling", prompt: "A service gets 10× more reads than writes. What helps most first?", options: ["Add read replicas and a cache", "Shard the database by user", "Add a message queue in front", "Move to one bigger server"], ans: 0 },
  { type: "multi", typeLabel: "Multi-select", topic: "Load balancing", prompt: "Which make app servers safe to add or remove behind a load balancer? Pick all that apply.", options: ["Sessions in a shared store", "Uploaded files on local disk", "An in-memory counter on each server", "No user state kept on the server"], ans: [0, 3] },
  { type: "diagram", typeLabel: "Pick the architecture", topic: "Availability", prompt: "Which design keeps taking orders if one database node dies?", ans: 1 },
  { type: "order", typeLabel: "Order the steps", topic: "Request flow", prompt: "Put a read that misses the cache in order.", items: ["DNS lookup", "Load balancer", "App server", "Cache (miss)", "Database"], start: [1, 3, 0, 4, 2] },
  { type: "text", typeLabel: "Short answer", topic: "Trade-offs", prompt: "In a sentence or two: during a network partition, what does CAP make you choose between?" },
  { type: "timed", typeLabel: "Timed · 30 seconds", topic: "Estimation", prompt: "1 crore daily users each make 20 requests. Roughly what’s the average requests per second?", options: ["About 230", "About 2,300", "About 23,000", "About 2,30,000"], ans: 1 },
];

/** Seconds allowed for the timed question. */
export const TIMED_SECONDS = 30;

/** Options for the "pick the diagram" question. Row 0 is the app tier. */
export const DIAGRAMS: { caption: string; rows: string[][] }[] = [
  { caption: "One app server, one database", rows: [["App"], ["DB"]] },
  { caption: "Primary and replica, automatic failover", rows: [["LB"], ["App", "App"], ["Primary", "Replica"]] },
  { caption: "A cache in front of one database", rows: [["App"], ["Cache"], ["DB"]] },
];

export interface QuickCheck { q: string; opts: string[]; ans: number; why: string }

/** The lesson recommended for each assessment topic the learner missed. Lesson ids are "module-lesson", zero-based. */
export const REVIEW_LESSON: Record<string, string> = {
  Scaling: "1-4",
  "Load balancing": "1-1",
  Availability: "1-3",
  "Request flow": "0-0",
  "Trade-offs": "1-3",
  Estimation: "1-0",
};

export type NotifType = "reply" | "streak" | "badge" | "module" | "assess";
export type NotifTarget = "player" | "progress" | "course" | "preresults";

export interface Notif {
  id: number;
  type: NotifType;
  title: string;
  body: string;
  time: string;
  group: "Today" | "Earlier";
  unread: boolean;
  go: NotifTarget;
}

/** The inbox's messages. Until there is a backend to send them, these are the examples the design ships with. */
export const NOTIFICATIONS: Notif[] = [
  { id: 1, type: "reply", title: "Klymb team replied", body: "“If I have auto-scaling, why pre-scale at all?”", time: "12 min ago", group: "Today", unread: true, go: "player" },
  { id: 2, type: "streak", title: "Your 6-day streak is waiting", body: "One lesson step keeps it.", time: "2 h ago", group: "Today", unread: true, go: "progress" },
  { id: 3, type: "badge", title: "Badge earned: First pass", body: "First lesson check passed.", time: "Yesterday", group: "Earlier", unread: false, go: "progress" },
  { id: 4, type: "module", title: "Day 5 is out", body: "Myntra sale: indexing and read replicas · 15 min", time: "2 days ago", group: "Earlier", unread: false, go: "course" },
  { id: 5, type: "assess", title: "Your retake is open", body: "Day 0 rewatched. Try again.", time: "4 days ago", group: "Earlier", unread: false, go: "player" },
];

/** The welcome screen: what the course gives you, before Day 0. [title, detail] */
export const WELCOME: [string, string][] = [
  ["21 days, one real Indian app each day", "Flipkart, Swiggy, IRCTC, UPI, Hotstar and more: what broke, and how they fixed it."],
  ["A 3-minute Hinglish story video", "With subtitles you can switch on or off."],
  ["You answer first, then learn", "Make your call, then see what really happened and the idea behind it."],
  ["Practice that feels like the interview", "Estimates, drag-and-drop designs and full design problems."],
  ["Interviewer follow-ups", "What they ask next, and a 2-minute answer you can say out loud."],
  ["A cheatsheet every day, at your own pace", "15 minutes a day, on your phone: metro, cab or canteen."],
];
