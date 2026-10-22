/**
 * Content for the System Design course app (/learn/system-design).
 *
 * All of it is draft copy from the Claude Design prototype: module and lesson
 * names, questions, quick checks, transcripts, takeaways, notifications, Q&A
 * threads and the learner "Priya". Replace it with the real course before launch.
 */

export interface CourseModule {
  title: string;
  /** Three labels animated on the player's thumbnail while the video plays. */
  flow: [string, string, string];
  /** [title, duration "m:ss"] */
  lessons: [string, string][];
}

export const MODULES: CourseModule[] = [
  { title: "Thinking at scale", flow: ["Users", "QPS", "Storage"], lessons: [["What interviews test", "6:20"], ["Latency numbers to know", "9:45"], ["Back-of-envelope estimation", "12:10"]] },
  { title: "Load balancing", flow: ["Client", "LB", "Servers"], lessons: [["L4 vs L7 balancers", "8:30"], ["Health checks and failover", "7:15"], ["Consistent hashing", "11:40"]] },
  { title: "Caching", flow: ["Client", "Cache", "DB"], lessons: [["Where caches live", "7:50"], ["Cache invalidation strategies", "12:34"], ["Thundering herds", "8:05"]] },
  { title: "Databases", flow: ["App", "Primary", "Replica"], lessons: [["SQL vs NoSQL in practice", "10:20"], ["Replication", "9:10"], ["Sharding and hot keys", "13:00"]] },
  { title: "Queues and async work", flow: ["Producer", "Queue", "Worker"], lessons: [["Why queues", "6:40"], ["Delivery guarantees", "10:05"], ["Backpressure", "7:30"]] },
  { title: "Consistency", flow: ["Write", "Quorum", "Read"], lessons: [["CAP and PACELC", "9:55"], ["Quorums", "8:45"], ["Idempotency", "7:20"]] },
  { title: "Case study: URL shortener", flow: ["API", "ID gen", "KV store"], lessons: [["Requirements and API", "8:00"], ["ID generation", "10:30"], ["Scaling reads", "9:15"]] },
  { title: "Case study: News feed", flow: ["Post", "Fan-out", "Feed"], lessons: [["Fan-out on write vs read", "12:20"], ["Ranking pipeline", "11:05"], ["Putting it together", "14:00"]] },
];

export type Question =
  | { type: "mcq" | "timed"; typeLabel: string; topic: string; prompt: string; options: string[]; ans: number }
  | { type: "multi"; typeLabel: string; topic: string; prompt: string; options: string[]; ans: number[] }
  | { type: "diagram"; typeLabel: string; topic: string; prompt: string; ans: number }
  | { type: "order"; typeLabel: string; topic: string; prompt: string; items: string[]; start: number[] }
  | { type: "text"; typeLabel: string; topic: string; prompt: string };

/** The pre- and post-assessment ask the same six questions, one of each type. */
export const QUESTIONS: Question[] = [
  { type: "mcq", typeLabel: "Multiple choice", topic: "Scaling", prompt: "A service gets 95% reads and 5% writes. What do you add first?", options: ["Read replicas and a cache", "Shard the write database", "A message queue in front of writes", "A bigger single server"], ans: 0 },
  { type: "multi", typeLabel: "Select all", topic: "Statelessness", prompt: "Which changes let a web service scale horizontally? Select all that apply.", options: ["Store sessions in a shared store like Redis", "Keep uploads on each server’s local disk", "Put instances behind a load balancer", "Hold counters in each server’s memory"], ans: [0, 2] },
  { type: "diagram", typeLabel: "Pick the diagram", topic: "Reliability", prompt: "Which setup keeps accepting writes if one database node fails?", ans: 1 },
  { type: "order", typeLabel: "Order the steps", topic: "Caching", prompt: "Put a cached read request in order, first to last.", items: ["DNS resolves the domain", "Load balancer picks a server", "App server handles the request", "Cache is checked", "Database is queried on a miss"], start: [2, 0, 4, 1, 3] },
  { type: "text", typeLabel: "Short answer", topic: "Consistency", prompt: "During a network partition, what does the CAP theorem make you choose between?" },
  { type: "timed", typeLabel: "Timed · 30s", topic: "Estimation", prompt: "10M daily users each make 20 requests. Roughly what is the average QPS?", options: ["~230", "~2,300", "~23,000", "~230,000"], ans: 1 },
];

/** Seconds allowed for the timed question. */
export const TIMED_SECONDS = 30;

/** Options for the "pick the diagram" question. Row 0 is the app tier. */
export const DIAGRAMS: { caption: string; rows: string[][] }[] = [
  { caption: "Single database", rows: [["App"], ["DB"]] },
  { caption: "Primary + replica, auto-failover", rows: [["App"], ["Primary", "Replica"]] },
  { caption: "Cache in front of one DB", rows: [["App"], ["Cache"], ["DB"]] },
];

export interface QuickCheck { q: string; opts: string[]; ans: number; why: string }

/** One ungraded in-video question per module, shown about halfway through each lesson. */
export const QUICK_CHECKS: QuickCheck[] = [
  { q: "One server handles 1,000 QPS. Average traffic is 2,000 QPS and peak is 4× that. How many servers at peak?", opts: ["2", "8", "4"], ans: 1, why: "Peak is 4 × 2,000 = 8,000 QPS. At 1,000 QPS per server you need 8, before adding headroom." },
  { q: "A user’s requests should keep reaching the same server. Which balancing method helps?", opts: ["Round robin", "Consistent hashing on user ID", "Random choice"], ans: 1, why: "Hashing the user ID maps each user to one server. Consistent hashing limits how many users move when servers are added or removed." },
  { q: "Reads must never see stale data after a write. Which cache strategy fits?", opts: ["Write-through", "Write-back", "TTL-only expiry"], ans: 0, why: "Write-through updates the cache and the database together, so the next read sees the new value. Write-back and TTL-only both leave a stale window." },
  { q: "Reads are slow but writes are fine. What helps most?", opts: ["Add read replicas", "Shard by user ID", "Queue the writes"], ans: 0, why: "Replicas spread read load across copies. Sharding mainly helps when writes or data size outgrow one node." },
  { q: "A consumer crashes after processing a message but before acknowledging it. With at-least-once delivery, what happens?", opts: ["The message is lost", "The message is delivered again", "The queue stops"], ans: 1, why: "Unacknowledged messages are redelivered, so consumers must be idempotent to handle duplicates safely." },
  { q: "With N = 3 replicas, which setting guarantees reads see the latest write?", opts: ["W=1, R=1", "W=2, R=2", "W=1, R=2"], ans: 1, why: "Reads overlap the latest write when W + R > N. Here 2 + 2 = 4, which is greater than 3." },
  { q: "Why encode short URL IDs in base62?", opts: ["It encrypts the ID", "It fits more IDs into fewer URL-safe characters", "It sorts faster"], ans: 1, why: "Base62 uses a–z, A–Z and 0–9, all URL-safe. Seven characters give about 3.5 trillion codes." },
  { q: "An account with 50M followers posts. Fan-out on write would…", opts: ["Be cheap", "Create 50M feed writes at once", "Skip the cache"], ans: 1, why: "Fan-out on write copies the post into every follower’s feed. For very large accounts, systems switch to fan-out on read." },
];

/** The lesson recommended for each assessment topic the learner missed. Lesson ids are "module-lesson", zero-based. */
export const REVIEW_LESSON: Record<string, string> = {
  Scaling: "3-1",
  Statelessness: "1-0",
  Reliability: "1-1",
  Caching: "2-1",
  Consistency: "5-0",
  Estimation: "0-2",
};

/** Written transcripts, [seconds, line]. Lessons without one get placeholder lines. */
export const TRANSCRIPTS: Record<string, [number, string][]> = {
  "2-1": [
    [0, "Caches make reads fast, but any cache can go stale. This lesson is about keeping it correct."],
    [45, "Start with the simplest rule: give every key a time to live, or TTL."],
    [95, "Write-through writes to the cache and the database in the same request."],
    [160, "Writes get a little slower, but reads never see stale data."],
    [230, "Write-back flips it: write to the cache now and flush to the database later."],
    [300, "It is fast, but a crash before the flush loses data."],
    [380, "Cache-aside is the most common pattern. The app reads the cache and loads from the database on a miss."],
    [410, "Add jitter to TTLs so hot keys don’t all expire in the same second."],
    [480, "On writes, delete the key instead of updating it. The next read refills it."],
    [560, "Watch for races between a slow read and a fast delete."],
    [640, "Versioned keys avoid that race entirely."],
    [700, "Next lesson: what happens when thousands of requests miss at once."],
  ],
};

/** Three key takeaways per module, shown on the module recap. */
export const TAKEAWAYS: [string, string, string][] = [
  ["Interviews test trade-offs, not memorized diagrams.", "Know rough latency numbers: memory is nanoseconds, disk is milliseconds, cross-region is about 100 ms.", "Estimate QPS and storage before you design anything."],
  ["L4 balances connections; L7 can route on paths and headers.", "Health checks remove bad servers before users notice.", "Consistent hashing moves only a small share of keys when servers change."],
  ["Put caches where reads repeat: client, CDN, app, or in front of the database.", "Write-through keeps reads fresh; cache-aside is the simple default.", "Add jitter to TTLs and guard hot keys against stampedes."],
  ["Pick SQL or NoSQL by access pattern.", "Replicas scale reads but add replication lag.", "Shard by a key that spreads load and avoids hot spots."],
  ["Queues absorb spikes and decouple producers from workers.", "At-least-once delivery means consumers must be idempotent.", "Backpressure protects downstream systems from overload."],
  ["During a partition you trade consistency against availability.", "Quorums need W + R > N to read the latest write.", "Idempotency keys make retries safe."],
  ["Start from requirements: read-heavy, short codes, long-lived links.", "Generate IDs without collisions, then base62-encode them.", "Cache popular links; reads far outnumber writes."],
  ["Fan-out on write is fast to read but costly for huge accounts.", "Mix strategies: push for most users, pull for very large accounts.", "Ranking runs as a pipeline you can tune separately."],
];

export type NotifType = "reply" | "streak" | "badge" | "module" | "assess";
export type NotifTarget = "discuss" | "player" | "progress" | "course" | "preresults";

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

export const NOTIFICATIONS: Notif[] = [
  { id: 1, type: "reply", title: "Ananya (Instructor) replied to your question", body: "“Write-through vs cache-aside: when to pick which?”", time: "12 min ago", group: "Today", unread: true, go: "discuss" },
  { id: 2, type: "streak", title: "Keep your 12-day streak", body: "One lesson or one quick check today keeps it going.", time: "2 h ago", group: "Today", unread: true, go: "player" },
  { id: 3, type: "badge", title: "Badge earned: 7-day streak", body: "You learned 7 days in a row.", time: "Yesterday", group: "Earlier", unread: false, go: "progress" },
  { id: 4, type: "module", title: "Module 04 is ready for you", body: "Databases: SQL vs NoSQL, replication and sharding.", time: "2 days ago", group: "Earlier", unread: false, go: "course" },
  { id: 5, type: "assess", title: "Your baseline is set", body: "You scored 33% on the pre-assessment.", time: "5 days ago", group: "Earlier", unread: false, go: "preresults" },
];

export interface Reply { name: string; ini: string; ago: string; inst: boolean; text: string }
export interface Thread { id: string; name: string; ini: string; ago: string; t: number; text: string; votes: number; replies: Reply[] }

/** Q&A threads per lesson id. The learner's own posts are named "You". */
export const THREADS: Record<string, Thread[]> = {
  "2-1": [
    { id: "t1", name: "Rahul M.", ini: "RM", ago: "2 d", t: 160, text: "If write-through makes every write slower, when is it still worth it?", votes: 24, replies: [{ name: "Ananya K.", ini: "AK", ago: "2 d", inst: true, text: "When stale reads cost more than slow writes: balances, inventory, permissions. For feeds or profiles, cache-aside with a short TTL is usually enough." }] },
    { id: "t2", name: "Sneha P.", ini: "SP", ago: "1 d", t: 410, text: "How much jitter should I add to TTLs? Is 10% a good rule?", votes: 11, replies: [{ name: "Vikram T.", ini: "VT", ago: "1 d", inst: false, text: "10–20% has worked for us. Spread expiries over a window wider than your refill time." }] },
    { id: "t3", name: "You", ini: "PS", ago: "3 h", t: 480, text: "Write-through vs cache-aside: when to pick which?", votes: 3, replies: [{ name: "Ananya K.", ini: "AK", ago: "12 min", inst: true, text: "Cache-aside is the default: simple, and resilient if the cache dies. Pick write-through when every read must see the latest write." }] },
  ],
};

export const ONBOARDING: [string, string][] = [
  ["Learn system design the way interviews test it", "8 modules of short videos, from estimation to real case studies like a URL shortener and a news feed."],
  ["Start with a 6-question baseline", "It doesn’t lock anything. At the end, the same topics show you exactly what you learned."],
  ["A small daily habit", "Watch one lesson or answer one quick check a day to keep your streak. Freezes cover the busy days."],
];

export const LEARNER = { name: "Priya Sharma", firstName: "Priya", initials: "PS", email: "priya@example.com" };

/** Sample streak figures shown on Home and Progress. */
export const STREAK = { current: 12, longest: 15, freezes: 2 };
